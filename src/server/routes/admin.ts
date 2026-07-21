import { Hono } from 'hono';
import { requireAuth, requireAdmin, type AuthEnv } from '../middleware/auth';
import { UUID_RE } from '../lib/validation';
import { getServiceClient } from '../lib/supabase';
import { cancelPayment } from '../lib/toss';

// 관리자 API — /api/v1/admin/* 전체가 requireAuth → requireAdmin 체인으로 보호됨.
// 조회는 유저 토큰(RLS의 admin 정책)으로 수행 — service role 불필요(이중 방어).
export const admin = new Hono<AuthEnv>();

admin.use('*', requireAuth, requireAdmin);

// 페이지 크기 — 문의는 목록+상세 분할 뷰라 10행, 테이블 뷰(유저·주문)는 30행
const pageOf = (c: { req: { query: (k: string) => string | undefined } }, size: number) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
  return { page, from: (page - 1) * size, to: page * size - 1 };
};

/* ── 검색(q) 유틸 ── */
// ilike 패턴 — 와일드카드(%·_)와 or() 구분자(콤마·괄호)는 리터럴 검색 의미가 없어 제거
const likePattern = (q: string) => `%${q.replace(/[%_,()]/g, '')}%`;
// 이름·이메일 검색 or() 식 (profiles·contacts 공용 — 컬럼명만 다름)
const personSearchOr = (q: string, cols: { name: string; email: string }) => {
  const pat = likePattern(q);
  return `${cols.name}.ilike.${pat},${cols.email}.ilike.${pat}`;
};
// 주문번호 프리픽스(표시용 8자리 등) → uuid 범위. uuid 대소 비교가 16바이트 순서라 hex 프리픽스와 정렬이 일치
const uuidPrefixRange = (prefix: string) => {
  const hex = prefix.toLowerCase();
  const fmt = (fill: string) => {
    const s = hex + fill.repeat(32 - hex.length);
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  };
  return { lo: fmt('0'), hi: fmt('f') };
};

const userDto = (r: Record<string, unknown>) => ({
  userId: r.user_id,
  email: r.user_email,
  name: r.user_name,
  phone: r.user_phone,
  postcode: r.user_postcode,
  address: r.user_address,
  addressDetail: r.user_address_detail,
  role: r.role,
  marketingConsent: r.marketing_consent,
  createdAt: r.created_at,
});

const orderItemDto = (r: Record<string, unknown>) => ({
  oitemId: r.oitem_id,
  productSku: r.product_sku,
  quantity: r.quantity,
  unitPrice: r.unit_price,
});

const orderDto = (r: Record<string, unknown>) => ({
  orderId: r.order_id,
  userId: r.user_id,
  totalPrice: r.total_price,
  status: r.status,
  receiverName: r.receiver_name,
  receiverPhone: r.receiver_phone,
  shippingPostcode: r.shipping_postcode,
  shippingAddress: r.shipping_address,
  shippingAddressDetail: r.shipping_address_detail,
  courier: r.courier,
  trackingNumber: r.tracking_number,
  refundReason: r.refund_reason,
  refundRequestedAt: r.refund_requested_at,
  refundedAt: r.refunded_at,
  refundAmount: r.refund_amount == null ? null : Number(r.refund_amount),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const contactDto = (r: Record<string, unknown>) => ({
  contactId: r.contact_id,
  channel: r.channel,
  userId: r.user_id,
  orderId: r.order_id,
  productSku: r.product_sku,
  contactType: r.contact_type,
  name: r.name,
  email: r.email,
  phone: r.phone,
  org: r.org,
  message: r.message,
  isDispute: r.is_dispute,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/* ── 유저 조회 (ADM-04·05) — q: 이름·이메일 검색 ── */
const USERS_PAGE_SIZE = 30;
admin.get('/users', async (c) => {
  const { page, from, to } = pageOf(c, USERS_PAGE_SIZE);
  // 탈퇴(익명화) 회원은 논리적 분리 보관 대상 — 활성 회원 목록에서 제외
  let query = c.get('db')
    .from('profiles')
    .select('user_id, user_email, user_name, user_phone, user_postcode, user_address, user_address_detail, role, marketing_consent, created_at', { count: 'exact' })
    .is('withdrawn_at', null);
  const q = c.req.query('q')?.trim();
  if (q) {
    query = query.or(personSearchOr(q, { name: 'user_name', email: 'user_email' }));
  }
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('admin users 조회 오류:', error);
    return c.json({ error: '유저 목록을 불러오지 못했습니다.' }, 500);
  }
  return c.json({ users: (data ?? []).map(userDto), total: count ?? 0, page, pageSize: USERS_PAGE_SIZE });
});

admin.get('/users/:id', async (c) => {
  if (!UUID_RE.test(c.req.param('id'))) return c.json({ error: '존재하지 않는 유저입니다.' }, 404);
  const { data, error } = await c.get('db')
    .from('profiles')
    .select('user_id, user_email, user_name, user_phone, user_postcode, user_address, user_address_detail, role, marketing_consent, created_at')
    .eq('user_id', c.req.param('id'))
    .maybeSingle();
  if (error) {
    console.error('admin user 조회 오류:', error);
    return c.json({ error: '유저 정보를 불러오지 못했습니다.' }, 500);
  }
  if (!data) return c.json({ error: '존재하지 않는 유저입니다.' }, 404);
  return c.json(userDto(data));
});

/* ── 주문 조회 (ADM-02·03) — q 검색: @ 포함=주문자 이메일(profiles 조인),
     hex 4~8자=주문번호 프리픽스, 그 외=수령인 이름 ── */
const ORDERS_PAGE_SIZE = 30;
admin.get('/orders', async (c) => {
  const { page, from, to } = pageOf(c, ORDERS_PAGE_SIZE);
  const q = c.req.query('q')?.trim();
  const emailSearch = !!q?.includes('@');

  // 이메일 검색일 때만 profiles !inner 조인 — 조인 컬럼 필터가 주문을 거르도록.
  // (as '*' 캐스팅: supabase-js 타입 파서가 조건부 select 문자열을 못 읽어 타입만 고정 — 런타임 무관)
  const selectCols = (emailSearch ? '*, profiles!inner(user_email)' : '*') as '*';
  let query = c.get('db')
    .from('orders')
    .select(selectCols, { count: 'exact' });
  const status = c.req.query('status');
  if (status) query = query.eq('status', status);

  if (q) {
    if (emailSearch) {
      query = query.ilike('profiles.user_email', likePattern(q));
    } else if (/^[0-9a-f]{4,8}$/i.test(q)) {
      const { lo, hi } = uuidPrefixRange(q);
      query = query.gte('order_id', lo).lte('order_id', hi);
    } else {
      query = query.ilike('receiver_name', likePattern(q));
    }
  }

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('admin orders 조회 오류:', error);
    return c.json({ error: '주문 목록을 불러오지 못했습니다.' }, 500);
  }
  return c.json({ orders: (data ?? []).map(orderDto), total: count ?? 0, page, pageSize: ORDERS_PAGE_SIZE });
});

admin.get('/orders/:id', async (c) => {
  if (!UUID_RE.test(c.req.param('id'))) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
  const { data, error } = await c.get('db')
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_id', c.req.param('id'))
    .maybeSingle();
  if (error) {
    console.error('admin order 조회 오류:', error);
    return c.json({ error: '주문 정보를 불러오지 못했습니다.' }, 500);
  }
  if (!data) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
  return c.json({
    ...orderDto(data),
    items: ((data.order_items as Record<string, unknown>[]) ?? []).map(orderItemDto),
  });
});

/* ── 주문 배달 관리 (ADM-06, 2차) — 운송장 입력 + 상태 전이 ──
   전이 규칙: PAID→SHIPPING(택배사·운송장 필수), SHIPPING→DELIVERED.
   RLS orders_update_admin으로 관리자만 갱신 가능(이중 방어). */
admin.patch('/orders/:id/delivery', async (c) => {
  if (!UUID_RE.test(c.req.param('id'))) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
  let body: { status?: string; courier?: string; trackingNumber?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  const courier = body.courier?.trim();
  const trackingNumber = body.trackingNumber?.trim();
  if ((courier && courier.length > 50) || (trackingNumber && trackingNumber.length > 50)) {
    return c.json({ error: '입력값이 너무 깁니다.' }, 400);
  }
  if (body.status !== undefined && body.status !== 'SHIPPING' && body.status !== 'DELIVERED') {
    return c.json({ error: 'status는 SHIPPING/DELIVERED 중 하나여야 합니다.' }, 400);
  }
  if (body.status === undefined && !courier && !trackingNumber) {
    return c.json({ error: '수정할 항목이 없습니다.' }, 400);
  }

  const db = c.get('db');
  const { data: order } = await db
    .from('orders')
    .select('order_id, status, courier, tracking_number')
    .eq('order_id', c.req.param('id'))
    .maybeSingle();
  if (!order) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);

  const update: Record<string, unknown> = {};
  if (courier) update.courier = courier;
  if (trackingNumber) update.tracking_number = trackingNumber;

  if (body.status === 'SHIPPING') {
    if (order.status !== 'PAID') {
      return c.json({ error: `결제 완료(PAID) 주문만 배송 시작할 수 있습니다. (현재: ${order.status})` }, 400);
    }
    if (!(trackingNumber ?? order.tracking_number)) {
      return c.json({ error: '배송 시작에는 운송장 번호가 필요합니다.' }, 400);
    }
    // 로젠택배 단독 계약 — UI는 운송장만 입력, 택배사는 서버가 기본값 세팅 (추후 확장 시 body.courier로 덮어씀)
    if (!courier && !order.courier) update.courier = '로젠택배';
    update.status = 'SHIPPING';
  } else if (body.status === 'DELIVERED') {
    if (order.status !== 'SHIPPING') {
      return c.json({ error: `배송 중(SHIPPING) 주문만 배송 완료할 수 있습니다. (현재: ${order.status})` }, 400);
    }
    update.status = 'DELIVERED';
  } else if (order.status !== 'PAID' && order.status !== 'SHIPPING') {
    // 운송장만 수정하는 경우도 배송 관리 대상 상태에서만
    return c.json({ error: '배송 관리 대상 주문이 아닙니다.' }, 400);
  }

  const { data, error } = await db
    .from('orders')
    .update(update)
    .eq('order_id', c.req.param('id'))
    .select()
    .maybeSingle();
  if (error || !data) {
    console.error('admin delivery 수정 오류:', error);
    return c.json({ error: '배송 정보 변경에 실패했습니다.' }, 500);
  }
  return c.json({ success: true, order: orderDto(data) });
});

/* ── 환불 관리 (ADM-08) — 유저는 환불 문의(contacts)로 접수, 처리는 관리자 전용 (backend.md §4):
   REQUEST: DELIVERED → REFUND_REQUESTED (사유 필수 — 문의 내용 요약. 반품 회수·검수 대기)
   APPROVE: REFUND_REQUESTED → REFUNDED (토스 취소 — refundAmount 미지정 시 전액, 지정 시 반품비 차감 부분취소)
   REJECT:  REFUND_REQUESTED → DELIVERED 복귀 (거절 사유는 이메일로 안내 — DB 미저장) ── */
admin.patch('/orders/:id/refund', async (c) => {
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
  let body: { action?: string; reason?: string; refundAmount?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }
  const action = body.action;
  if (action !== 'REQUEST' && action !== 'APPROVE' && action !== 'REJECT') {
    return c.json({ error: 'action은 REQUEST/APPROVE/REJECT 중 하나여야 합니다.' }, 400);
  }

  const db = c.get('db');
  const { data: order } = await db
    .from('orders')
    .select('order_id, status, total_price, refund_reason')
    .eq('order_id', id)
    .maybeSingle();
  if (!order) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);

  if (action === 'REQUEST') {
    const reason = body.reason?.trim();
    if (!reason) return c.json({ error: '환불 사유를 입력해 주세요.' }, 400);
    if (reason.length > 200) return c.json({ error: '환불 사유는 200자 이내로 입력해 주세요.' }, 400);
    if (order.status !== 'DELIVERED') {
      return c.json({ error: `배송 완료(DELIVERED) 주문만 환불 접수할 수 있습니다. (현재: ${order.status})` }, 400);
    }
    // status 조건을 갱신에도 걸어 동시 요청 시 한 번만 전이 (배송 관리와 달리 돈이 걸린 전이라 명시 가드)
    const { data, error } = await db
      .from('orders')
      .update({ status: 'REFUND_REQUESTED', refund_reason: reason, refund_requested_at: new Date().toISOString() })
      .eq('order_id', id)
      .eq('status', 'DELIVERED')
      .select()
      .maybeSingle();
    if (error || !data) {
      if (!error) return c.json({ error: '주문 상태가 변경되었습니다. 새로고침해 주세요.' }, 409);
      console.error('refund REQUEST 전이 오류:', error);
      return c.json({ error: '환불 접수에 실패했습니다.' }, 500);
    }
    return c.json({ success: true, order: orderDto(data) });
  }

  if (order.status !== 'REFUND_REQUESTED') {
    return c.json({ error: `환불 접수(REFUND_REQUESTED) 주문만 처리할 수 있습니다. (현재: ${order.status})` }, 400);
  }

  if (action === 'REJECT') {
    // REQUEST가 DELIVERED에서만 가능하므로 복귀 상태는 항상 DELIVERED.
    // refund_reason·requested_at은 접수 이력으로 보존 (재접수 시 덮어씀)
    const { data, error } = await db
      .from('orders')
      .update({ status: 'DELIVERED' })
      .eq('order_id', id)
      .eq('status', 'REFUND_REQUESTED')
      .select()
      .maybeSingle();
    if (error || !data) {
      if (!error) return c.json({ error: '주문 상태가 변경되었습니다. 새로고침해 주세요.' }, 409);
      console.error('refund REJECT 전이 오류:', error);
      return c.json({ error: '환불 거절에 실패했습니다.' }, 500);
    }
    return c.json({ success: true, order: orderDto(data) });
  }

  // APPROVE — 환불액 확정(기본 전액) 후 토스 취소 → REFUNDED
  const total = Number(order.total_price);
  const amount = body.refundAmount == null ? total : Number(body.refundAmount);
  // 토스 취소 금액은 원 단위 정수만 유효 — 소수는 사전 차단
  if (!Number.isInteger(amount) || amount <= 0 || amount > total) {
    return c.json({ error: `환불 금액이 올바르지 않습니다. (1 ~ ${total}원 정수)` }, 400);
  }

  // payments는 관리자 RLS 조회 정책이 없어 service role로 접근 (orders.ts 취소 경로와 동일)
  const service = getServiceClient();
  if (!service) return c.json({ error: '서버 설정 오류입니다.' }, 500);
  const { data: donePay } = await service
    .from('payments')
    .select('payment_id, payment_key')
    .eq('order_id', id)
    .eq('status', 'DONE')
    .order('approved_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!donePay) {
    console.error(`refund APPROVE: 승인(DONE) 결제가 없음 (order_id=${id})`);
    return c.json({ error: '결제 정보를 확인할 수 없습니다. 결제 내역 대사가 필요합니다.' }, 500);
  }

  const reason = order.refund_reason ?? '환불 승인';

  // 이중 환불 방지 — 토스 호출 '전에' REFUNDED로 CAS 선점. 부분취소(cancelAmount)는
  // 전액취소(ALREADY_CANCELED 멱등)와 달리 토스가 잔액 내 반복 실행을 허용하므로,
  // 동시 APPROVE·실패 후 재시도가 취소를 중복 실행하지 않도록 상태 전이를 먼저 건다.
  // 토스 취소 실패 시 아래에서 REFUND_REQUESTED로 복귀시켜 재시도를 허용한다.
  const { data: claimed, error: claimError } = await db
    .from('orders')
    .update({ status: 'REFUNDED', refunded_at: new Date().toISOString(), refund_amount: amount })
    .eq('order_id', id)
    .eq('status', 'REFUND_REQUESTED')
    .select()
    .maybeSingle();
  if (claimError || !claimed) {
    if (!claimError) return c.json({ error: '주문 상태가 변경되었습니다. 새로고침해 주세요.' }, 409);
    console.error('refund APPROVE 선점 오류:', claimError);
    return c.json({ error: '환불 처리에 실패했습니다.' }, 500);
  }

  // 전액이어도 cancelAmount를 명시해 의도를 고정 — 이미 취소된 결제는 멱등 성공 처리
  const result = await cancelPayment(donePay.payment_key, reason, amount);
  if (!result || (!result.ok && result.errorCode !== 'ALREADY_CANCELED_PAYMENT')) {
    // 출금 없음 — 선점을 되돌려 재시도 가능 상태로 복귀
    const { error: revertError } = await db
      .from('orders')
      .update({ status: 'REFUND_REQUESTED', refunded_at: null, refund_amount: null })
      .eq('order_id', id)
      .eq('status', 'REFUNDED');
    if (revertError) {
      console.error('refund APPROVE 선점 복구 오류:', revertError);
      return c.json({ error: '결제 취소가 실행되지 않았으나 주문 상태 복구에 실패했습니다. 새로고침 후 결제 내역을 확인해 주세요.' }, 500);
    }
    if (!result) return c.json({ error: '서버 설정 오류입니다.' }, 500);
    console.error('toss 환불 취소 실패:', result.status, result.errorCode, result.errorMessage);
    return c.json({ error: result.errorMessage ?? '결제 취소에 실패했습니다.' }, 502);
  }

  // 부분취소면 토스 상태가 PARTIAL_CANCELED — 응답값 우선, 없으면 금액으로 판별
  const payStatus = (result.payment?.status as string | undefined)
    ?? (amount < total ? 'PARTIAL_CANCELED' : 'CANCELED');
  const { error: payError } = await service
    .from('payments')
    .update({ status: payStatus, canceled_at: new Date().toISOString(), cancel_reason: reason })
    .eq('payment_id', donePay.payment_id);
  if (payError) console.error('payments 환불 기록 오류:', payError); // 토스는 이미 취소됨 — 기록 실패만 로깅

  return c.json({ success: true, order: orderDto(claimed) });
});

/* ── 문의 관리 (ADM-07) — channel·status·is_dispute 필터 + q(이름·이메일) 검색 ── */
const CONTACTS_PAGE_SIZE = 10;
admin.get('/contacts', async (c) => {
  const { page, from, to } = pageOf(c, CONTACTS_PAGE_SIZE);
  let query = c.get('db')
    .from('contacts')
    .select('*', { count: 'exact' });
  const channel = c.req.query('channel');
  const status = c.req.query('status');
  const isDispute = c.req.query('is_dispute');
  if (channel) query = query.eq('channel', channel);
  if (status) query = query.eq('status', status);
  if (isDispute === 'true' || isDispute === 'false') query = query.eq('is_dispute', isDispute === 'true');
  const q = c.req.query('q')?.trim();
  if (q) {
    query = query.or(personSearchOr(q, { name: 'name', email: 'email' }));
  }
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('admin contacts 조회 오류:', error);
    return c.json({ error: '문의 목록을 불러오지 못했습니다.' }, 500);
  }
  return c.json({ contacts: (data ?? []).map(contactDto), total: count ?? 0, page, pageSize: CONTACTS_PAGE_SIZE });
});

const CONTACT_STATUS = ['RECEIVED', 'IN_PROGRESS', 'DONE'] as const;

admin.patch('/contacts/:id', async (c) => {
  if (!UUID_RE.test(c.req.param('id'))) return c.json({ error: '존재하지 않는 문의입니다.' }, 404);
  let body: { status?: string; isDispute?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!CONTACT_STATUS.includes(body.status as (typeof CONTACT_STATUS)[number])) {
      return c.json({ error: `status는 ${CONTACT_STATUS.join('/')} 중 하나여야 합니다.` }, 400);
    }
    update.status = body.status;
  }
  // is_dispute 표시가 보유기간(일반 1년/분쟁 3년)을 가르는 장치 — backend.md §6
  if (typeof body.isDispute === 'boolean') update.is_dispute = body.isDispute;

  if (Object.keys(update).length === 0) {
    return c.json({ error: '수정할 항목이 없습니다.' }, 400);
  }

  const { data, error } = await c.get('db')
    .from('contacts')
    .update(update)
    .eq('contact_id', c.req.param('id'))
    .select()
    .maybeSingle();
  if (error) {
    console.error('admin contact 수정 오류:', error);
    return c.json({ error: '문의 상태 변경에 실패했습니다.' }, 500);
  }
  if (!data) return c.json({ error: '존재하지 않는 문의입니다.' }, 404);
  return c.json({ success: true, contact: contactDto(data) });
});
