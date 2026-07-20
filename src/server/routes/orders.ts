import { Hono } from 'hono';
import { MAX_ITEMS, MAX_QTY } from '../../data/order';
import { SHIPPING_FEE } from '../../data/shipping';
import { getServiceClient } from '../lib/supabase';
import { cancelPayment } from '../lib/toss';
import { requireAuth, type AuthEnv } from '../middleware/auth';
import { UUID_RE } from '../lib/validation';

// 주문 (2차 — backend.md §3·§4) — 회원 전용.
// 금액은 서버가 DB 단가로 재계산(클라이언트 금액 신뢰 금지): 총액 = 상품합 + 배송비(정액).
// 생성·상태 전이·삭제는 service role — 유저 토큰의 직접 insert 정책은 금액(total_price·unit_price)을
// 검증하지 못해 제거됨(20260716000000 마이그레이션). 서버가 재계산한 금액만 DB에 들어간다.
export const orders = new Hono<AuthEnv>();

orders.use('/orders', requireAuth);
orders.use('/orders/:id', requireAuth);
orders.use('/orders/:id/cancel', requireAuth);

// 배송지 스냅샷 필드 한도 — orders 컬럼(varchar) 초과를 22001 전에 400으로 (users.ts와 동일 접근)
const FIELD_LIMITS = {
  receiverName: 100,
  receiverPhone: 20,
  shippingAddress: 255,
  shippingAddressDetail: 255,
} as const;

// 주문 품목 조인 행 → 응답 매핑 (GET /orders·GET /orders/:id 공용)
type ItemRow = { product_sku: string; quantity: number; unit_price: number; products: { product_name: string } | null };
const mapItems = (rows: unknown) =>
  ((rows ?? []) as unknown as ItemRow[]).map((i) => ({
    productSku: i.product_sku,
    productName: i.products?.product_name ?? i.product_sku,
    quantity: i.quantity,
    unitPrice: Number(i.unit_price),
  }));

/* ── 주문 생성 — status=PENDING, 응답의 orderId·totalPrice로 토스 위젯 호출 ── */
orders.post('/orders', async (c) => {
  let body: {
    items?: unknown;
    receiverName?: string;
    receiverPhone?: string;
    shippingPostcode?: string;
    shippingAddress?: string;
    shippingAddressDetail?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  // 품목 검증
  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > MAX_ITEMS) {
    return c.json({ error: '주문 품목이 올바르지 않습니다.' }, 400);
  }
  const items: { sku: string; qty: number }[] = [];
  for (const r of rawItems) {
    const sku = (r as { productSku?: unknown } | null)?.productSku;
    const qty = Number((r as { quantity?: unknown } | null)?.quantity);
    if (typeof sku !== 'string' || !sku.trim() || sku.length > 50 || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return c.json({ error: '주문 품목이 올바르지 않습니다.' }, 400);
    }
    items.push({ sku: sku.trim(), qty });
  }
  if (new Set(items.map((i) => i.sku)).size !== items.length) {
    return c.json({ error: '중복된 제품이 있습니다.' }, 400);
  }

  // 배송지 검증
  const receiverName = body.receiverName?.trim() ?? '';
  const receiverPhone = body.receiverPhone?.trim() ?? '';
  const shippingPostcode = body.shippingPostcode?.trim() ?? '';
  const shippingAddress = body.shippingAddress?.trim() ?? '';
  const shippingAddressDetail = body.shippingAddressDetail?.trim() ?? '';
  if (!receiverName || !receiverPhone || !shippingAddress) {
    return c.json({ error: '수령인·연락처·배송지를 입력해 주세요.' }, 400);
  }
  if (!/^\d{5}$/.test(shippingPostcode)) {
    return c.json({ error: '우편번호가 올바르지 않습니다.' }, 400);
  }
  const fields = { receiverName, receiverPhone, shippingAddress, shippingAddressDetail };
  for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
    if (fields[key as keyof typeof FIELD_LIMITS].length > limit) {
      return c.json({ error: '입력값이 너무 깁니다.' }, 400);
    }
  }

  // 서버 금액 재계산 — 판매 중(is_active) 제품의 DB 단가만 사용
  const db = c.get('db');
  const { data: products, error: productsError } = await db
    .from('products')
    .select('product_sku, product_name, product_price')
    .in('product_sku', items.map((i) => i.sku))
    .eq('is_active', true);
  if (productsError) {
    console.error('orders 제품 조회 오류:', productsError);
    return c.json({ error: '주문을 생성하지 못했습니다.' }, 500);
  }
  const bySku = new Map((products ?? []).map((p) => [p.product_sku, p]));
  if (bySku.size !== items.length) {
    // 어떤 SKU가 판매 중이 아닌지 알려준다 — 바로구매에서 옵션 하나가 품절이어도 본품까지
    // 막히지 않도록, 클라이언트가 품절 옵션만 빼고 다시 시도할 수 있게 한다.
    const unavailableSkus = items.filter((i) => !bySku.has(i.sku)).map((i) => i.sku);
    return c.json({ error: '판매 중이 아닌 제품이 포함되어 있습니다.', unavailableSkus }, 400);
  }

  const priced = items.map((i) => {
    const p = bySku.get(i.sku)!;
    return { ...i, name: p.product_name, unitPrice: Number(p.product_price) };
  });
  const itemsTotal = priced.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const totalPrice = itemsTotal + SHIPPING_FEE;

  // 주문 insert — service role (유저 토큰 insert 정책 없음). 본인·PENDING은 서버가 값으로 보장.
  const service = getServiceClient();
  if (!service) return c.json({ error: '서버 설정 오류입니다.' }, 500);
  const uid = c.get('user').id;
  const { data: order, error: orderError } = await service
    .from('orders')
    .insert({
      user_id: uid,
      total_price: totalPrice,
      status: 'PENDING',
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      shipping_postcode: shippingPostcode,
      shipping_address: shippingAddress,
      shipping_address_detail: shippingAddressDetail,
    })
    .select('order_id')
    .single();
  if (orderError || !order) {
    console.error('orders 생성 오류:', orderError);
    return c.json({ error: '주문을 생성하지 못했습니다.' }, 500);
  }

  const { error: itemsError } = await service.from('order_items').insert(
    priced.map((i) => ({
      order_id: order.order_id,
      product_sku: i.sku,
      quantity: i.qty,
      unit_price: i.unitPrice,
    }))
  );
  if (itemsError) {
    // 품목 없이 남은 주문 정리 — 서버리스에서 응답 후 함수가 동결되면 미완료될 수 있어
    // 반드시 await로 완료를 보장한다(유령 주문 방지).
    console.error('order_items 생성 오류:', itemsError);
    const { error: rollbackError } = await service.from('orders').delete().eq('order_id', order.order_id);
    if (rollbackError) console.error('orders 롤백 오류:', rollbackError);
    return c.json({ error: '주문을 생성하지 못했습니다.' }, 500);
  }

  return c.json(
    {
      orderId: order.order_id, // 토스 위젯 orderId로 그대로 사용 (uuid — backend.md §2)
      itemsTotal,
      shippingFee: SHIPPING_FEE,
      totalPrice,
      orderName: priced.length > 1 ? `${priced[0].name} 외 ${priced.length - 1}건` : priced[0].name,
    },
    201
  );
});

/* ── 내 주문 내역 — 품목·제품명 조인. RLS는 own_or_admin이라 관리자는 전체가 보이므로
     이 '내 주문' 목록에는 user_id를 명시 필터(단건·취소 경로와 동일하게 본인 소유만) ── */
orders.get('/orders', async (c) => {
  const { data, error } = await c.get('db')
    .from('orders')
    .select(
      'order_id, total_price, status, receiver_name, shipping_postcode, shipping_address, shipping_address_detail, courier, tracking_number, created_at, order_items(product_sku, quantity, unit_price, products(product_name))'
    )
    .eq('user_id', c.get('user').id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('orders 조회 오류:', error);
    return c.json({ error: '주문 내역을 불러오지 못했습니다.' }, 500);
  }
  return c.json({
    orders: (data ?? []).map((o) => ({
      orderId: o.order_id,
      totalPrice: Number(o.total_price),
      status: o.status,
      receiverName: o.receiver_name,
      shippingPostcode: o.shipping_postcode,
      shippingAddress: o.shipping_address,
      shippingAddressDetail: o.shipping_address_detail,
      courier: o.courier,
      trackingNumber: o.tracking_number,
      createdAt: o.created_at,
      items: mapItems(o.order_items),
    })),
  });
});

/* ── 주문 단건 조회 — PENDING 재결제 모드(/checkout?orderId=)의 주문서 로드용 ── */
orders.get('/orders/:id', async (c) => {
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);

  const { data: o } = await c.get('db')
    .from('orders')
    .select(
      'order_id, user_id, total_price, status, receiver_name, receiver_phone, shipping_postcode, shipping_address, shipping_address_detail, created_at, order_items(product_sku, quantity, unit_price, products(product_name))'
    )
    .eq('order_id', id)
    .maybeSingle();
  if (!o || o.user_id !== c.get('user').id) {
    // 관리자도 RLS로 조회는 되지만 이 경로는 본인 주문 전용(재결제)
    return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
  }
  const items = mapItems(o.order_items);
  const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  return c.json({
    orderId: o.order_id,
    totalPrice: Number(o.total_price),
    shippingFee: Number(o.total_price) - itemsTotal, // 재결제 주문서 표시용 — 주문 시점 배송비(스냅샷 역산)
    status: o.status,
    receiverName: o.receiver_name,
    receiverPhone: o.receiver_phone,
    shippingPostcode: o.shipping_postcode,
    shippingAddress: o.shipping_address,
    shippingAddressDetail: o.shipping_address_detail,
    createdAt: o.created_at,
    items,
  });
});

/* ── 주문 취소 — 상태 분기 (backend.md §4·§6 확정):
     PENDING + payments 없음 → 주문 삭제(위젯 이탈·failUrl 복귀 정리 겸용)
     PENDING + payments 있음(승인 실패만) → CANCELLED (결제사 대사 기록 보존)
     PENDING + 캡처된(DONE) 결제 있음(전이 실패 잔여) → PAID와 동일하게 토스 환불 후 CANCELLED
     PAID → 토스 결제 취소 후 CANCELLED (배송 전만 — ORD-10)
     SHIPPING·DELIVERED → 400, CANCELLED → 멱등 성공 ── */
orders.post('/orders/:id/cancel', async (c) => {
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);

  // fail 페이지의 best-effort 정리(mode=abandon): 결제 시도가 있으면 재시도를 위해 주문을 보존하고
  // 배송·결제완료 건은 건드리지 않는다. 사용자의 명시적 '주문 취소'는 mode 없이 호출된다.
  const abandon = c.req.query('mode') === 'abandon';

  const db = c.get('db');
  const { data: order } = await db
    .from('orders')
    .select('order_id, user_id, status')
    .eq('order_id', id)
    .maybeSingle();
  if (!order || order.user_id !== c.get('user').id) {
    // RLS로 타인 주문은 조회 자체가 안 되지만, 관리자 세션(select_own_or_admin)이
    // 이 경로로 남의 주문을 취소하는 것은 별개 권한이므로 본인 소유를 명시 확인
    return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
  }

  if (order.status === 'CANCELLED') return c.json({ success: true, status: 'CANCELLED' });
  if (order.status === 'SHIPPING' || order.status === 'DELIVERED') {
    if (abandon) return c.json({ success: true, status: order.status }); // 자동 정리는 배송 건을 건드리지 않음
    return c.json({ error: '배송이 시작된 주문은 취소할 수 없습니다. 고객센터로 문의해 주세요.' }, 400);
  }

  const service = getServiceClient();
  if (!service) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  // PENDING이면 payments를 한 번만 조회해 재사용(캡처된 DONE 행 선택까지). PAID 경로는 아래에서 별도 조회.
  let donePay: { payment_id: string; payment_key: string } | undefined;

  if (order.status === 'PENDING') {
    // 상태까지 조회 — 캡처된(DONE) 결제가 섞여 있으면 환불이 필요하므로 분기해야 함
    const { data: pays } = await db
      .from('payments')
      .select('payment_id, payment_key, status, approved_at')
      .eq('order_id', id);
    if (!pays?.length) {
      const { error } = await service.from('orders').delete().eq('order_id', id); // order_items CASCADE
      if (error) {
        console.error('orders 삭제 오류:', error);
        return c.json({ error: '주문을 취소하지 못했습니다.' }, 500);
      }
      return c.json({ success: true, status: 'DELETED' });
    }
    // 결제 시도가 있는 PENDING — abandon(자동 정리)이면 재시도를 위해 보존(재결제 버튼 유지)
    if (abandon) return c.json({ success: true, status: 'PENDING' });
    if (!pays.some((p) => p.status === 'DONE')) {
      // 승인 여부 불명(IN_PROGRESS)이 섞여 있으면 캡처됐을 수 있어(돈 묶임) 자동 취소 금지 —
      // cleanup_skip_captured 마이그레이션과 동일하게 대사(수동/웹훅 환불)로 넘긴다.
      if (pays.some((p) => p.status === 'IN_PROGRESS')) {
        return c.json({ error: '결제 확인이 진행 중입니다. 잠시 후 주문 내역에서 상태를 확인하시거나 고객센터로 문의해 주세요.' }, 409);
      }
      // 캡처된(DONE)·불명(IN_PROGRESS) 결제가 없음(ABORTED 등 승인 실패만) — 출금이 없으므로 바로 CANCELLED
      const { error } = await service.from('orders').update({ status: 'CANCELLED' }).eq('order_id', id);
      if (error) {
        console.error('orders 취소 전이 오류:', error);
        return c.json({ error: '주문을 취소하지 못했습니다.' }, 500);
      }
      return c.json({ success: true, status: 'CANCELLED' });
    }
    // 캡처된(DONE) 결제가 남은 PENDING(상태 전이 실패 잔여) — 방금 조회한 pays에서 최신 승인 건을 골라
    // 추가 조회 없이 아래 환불 로직으로 진행(approved_at 내림차순).
    donePay = pays
      .filter((p) => p.status === 'DONE')
      .sort((a, b) => (b.approved_at ?? '').localeCompare(a.approved_at ?? ''))[0];
  }

  // PAID(또는 캡처된 결제가 남은 PENDING) — abandon 모드(자동 정리)는 결제 취소·환불을 트리거하지 않는다
  if (abandon) return c.json({ success: true, status: 'PAID' });

  // 승인된 결제(DONE)를 토스에서 취소 후 상태 전이. PAID 경로는 pays 미조회이므로 여기서 DONE 행 조회.
  if (!donePay) {
    const { data: payment } = await db
      .from('payments')
      .select('payment_id, payment_key')
      .eq('order_id', id)
      .eq('status', 'DONE')
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    donePay = payment ?? undefined;
  }
  if (!donePay) {
    console.error(`orders cancel: PAID 주문에 DONE 결제가 없음 (order_id=${id})`);
    return c.json({ error: '결제 정보를 확인할 수 없습니다. 고객센터로 문의해 주세요.' }, 500);
  }

  const reason = '고객 요청 취소';
  const result = await cancelPayment(donePay.payment_key, reason);
  if (!result) return c.json({ error: '서버 설정 오류입니다.' }, 500);
  // 이미 취소된 결제는 성공으로 간주(멱등) — 그 외 오류는 중단
  if (!result.ok && result.errorCode !== 'ALREADY_CANCELED_PAYMENT') {
    console.error('toss 취소 실패:', result.status, result.errorCode, result.errorMessage);
    return c.json({ error: result.errorMessage ?? '결제 취소에 실패했습니다.' }, 502);
  }

  const { error: payError } = await service
    .from('payments')
    .update({ status: 'CANCELED', canceled_at: new Date().toISOString(), cancel_reason: reason })
    .eq('payment_id', donePay.payment_id);
  if (payError) console.error('payments 취소 기록 오류:', payError); // 토스는 이미 취소됨 — 기록 실패만 로깅

  const { error: orderError } = await service.from('orders').update({ status: 'CANCELLED' }).eq('order_id', id);
  if (orderError) {
    console.error('orders 취소 전이 오류:', orderError);
    return c.json({ error: '결제는 취소되었으나 주문 상태 갱신에 실패했습니다. 새로고침해 주세요.' }, 500);
  }
  return c.json({ success: true, status: 'CANCELLED' });
});
