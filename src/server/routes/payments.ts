import { Hono } from 'hono';
import { getServiceClient } from '../lib/supabase';
import { confirmPayment, getPayment } from '../lib/toss';
import { requireAuth, type AuthEnv } from '../middleware/auth';
import { UUID_RE } from '../lib/validation';

// 결제 승인 (2차 — backend.md §4 결제 플로우 4~5단계).
// 위젯 인증 성공 → successUrl(paymentKey, orderId, amount 쿼리) → 이 API 호출.
// 가드: 주문 존재 + 본인 + PENDING + 금액 일치 확인 후에만 토스 승인 호출.
// 이미 PAID면 멱등 성공(successUrl 새로고침 대응). payments 기록은 service role(RLS insert 정책 없음).
export const payments = new Hono<AuthEnv>();

payments.use('/payments/confirm', requireAuth);

payments.post('/payments/confirm', async (c) => {
  let body: { paymentKey?: string; orderId?: string; amount?: number | string; cartItemIds?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey.trim() : '';
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const amount = Number(body.amount);
  if (!paymentKey || paymentKey.length > 200 || !UUID_RE.test(orderId) || !Number.isInteger(amount) || amount <= 0) {
    return c.json({ error: '결제 정보가 올바르지 않습니다.' }, 400);
  }

  // 주문 가드 — 유저 토큰(RLS)으로 본인 주문 확인
  const db = c.get('db');
  const { data: order } = await db
    .from('orders')
    .select('order_id, user_id, status, total_price')
    .eq('order_id', orderId)
    .maybeSingle();
  if (!order || order.user_id !== c.get('user').id) {
    return c.json({ error: '존재하지 않는 주문입니다.' }, 404); // 24h 정리로 삭제된 주문의 늦은 confirm도 여기
  }
  if (order.status === 'PAID') {
    return c.json({ success: true, orderId, status: 'PAID' }); // 멱등 — 이미 승인 완료
  }
  if (order.status !== 'PENDING') {
    return c.json({ error: '결제할 수 없는 주문 상태입니다.' }, 400);
  }
  if (amount !== Number(order.total_price)) {
    // 위젯 호출 사이에 금액이 조작된 요청 — 토스 호출 전에 차단 (backend.md §4-4)
    console.error(`payments confirm 금액 불일치: order=${orderId} 주문액=${order.total_price} 요청액=${amount}`);
    return c.json({ error: '결제 금액이 주문 금액과 일치하지 않습니다.' }, 400);
  }

  const service = getServiceClient();
  if (!service) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  // 토스 confirm 전에 payments 행을 선점(IN_PROGRESS) — 두 가지를 동시에 보장한다:
  //  ① payment_key가 UNIQUE라 동시 이중 confirm의 두 번째 요청은 여기서 걸러진다(토스 중복 호출 방지).
  //  ② 주문이 이 순간 이미 삭제됐다면 FK(23503)로 실패하므로, 출금(토스 호출) 전에 중단한다.
  //  또한 행이 생기면 정리 크론의 not-exists-payments 가드가 이 주문을 삭제 대상에서 제외한다.
  const { error: lockError } = await service.from('payments').insert({
    order_id: orderId,
    payment_key: paymentKey,
    amount,
    status: 'IN_PROGRESS',
  });
  if (lockError) {
    if (lockError.code === '23503') {
      // 주문이 confirm 직전에 사라짐 — 토스 호출 안 함(돈 안 빠짐)
      return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
    }
    if (lockError.code === '23505') {
      // 같은 payment_key로 confirm이 이미 진행/완료됨 (successUrl 새로고침·동시 요청)
      const { data: existing } = await service
        .from('payments')
        .select('order_id, status, receipt_url')
        .eq('payment_key', paymentKey)
        .maybeSingle();
      // 이 paymentKey가 다른 주문의 것이면(오래된/조작된 요청) 요청 주문을 결제됨으로 응답하면 안 됨
      if (!existing || existing.order_id !== orderId) {
        return c.json({ error: '결제 정보가 올바르지 않습니다.' }, 409);
      }
      if (existing.status === 'DONE') {
        // 이전 confirm이 캡처는 됐으나 주문 PAID 전이가 실패해 PENDING으로 남았을 수 있음 —
        // 여기서 멱등하게 전이를 재시도해 복구(안 하면 24h 정리 크론이 결제된 주문을 취소해 버림).
        const { error: fixError } = await service
          .from('orders')
          .update({ status: 'PAID' })
          .eq('order_id', orderId)
          .eq('status', 'PENDING');
        if (fixError) {
          console.error('orders PAID 전이 재시도 오류:', fixError);
          return c.json({ error: '결제는 완료되었으나 주문 상태 갱신에 실패했습니다. 새로고침해 주세요.' }, 500);
        }
        return c.json({ success: true, orderId, status: 'PAID', receiptUrl: existing.receipt_url ?? null });
      }
      return c.json({ error: '결제를 처리 중입니다. 잠시 후 주문 내역에서 확인해 주세요.' }, 409);
    }
    console.error('payments 선점 오류:', lockError);
    return c.json({ error: '결제 처리 중 오류가 발생했습니다.' }, 500);
  }

  // 토스 승인
  let result = await confirmPayment(paymentKey, orderId, amount);
  if (!result) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  // confirm POST의 ok=true는 승인(DONE)을 의미. 네트워크 순단(NETWORK_ERROR)은 승인 여부가 불확실하므로
  // ABORTED로 단정하지 않고 토스에 실제 상태를 조회해 재확인한다 — 캡처됐는데 재시도를 유도하면 이중청구.
  let approved = result.ok;
  if (!result.ok && result.errorCode === 'NETWORK_ERROR') {
    const check = await getPayment(paymentKey);
    if (!check) return c.json({ error: '서버 설정 오류입니다.' }, 500);
    if (check.ok && check.payment?.status === 'DONE') {
      result = check; // 실제로는 승인됨 — 아래 정상 승인 처리로 진행
      approved = true;
    } else if (check.ok && (check.payment?.status === 'ABORTED' || check.payment?.status === 'EXPIRED')) {
      result = check; // 미승인 '확정'(ABORTED·EXPIRED) — 캡처 안 됨이 확실하므로 실패(ABORTED) 처리
      approved = false;
    } else {
      // 조회 실패거나 상태가 IN_PROGRESS 등 승인 여부 불명 — 캡처됐을 수 있어 ABORTED로 단정하면
      // 새 결제를 유도해 이중청구가 된다. 선점 행을 IN_PROGRESS로 남겨(ABORTED 아님) 새 결제 유도를
      // 막고, 재시도 대신 주문 내역 확인을 안내한다. 대사(수동/웹훅)로 후처리.
      console.error(`payments confirm: 승인 결과 불명(네트워크) — 대사 필요 (order_id=${orderId}, status=${check.ok ? check.payment?.status : 'CHECK_FAILED'})`);
      return c.json({ error: '결제 결과를 확인하지 못했습니다. 중복 결제 방지를 위해 재시도하지 마시고 주문 내역에서 상태를 확인해 주세요.' }, 502);
    }
  }

  if (!approved) {
    // 선점 행을 ABORTED로 갱신 (재시도는 새 paymentKey로 진행). 주문은 PENDING 유지.
    const { error: recordError } = await service
      .from('payments')
      .update({ status: 'ABORTED', raw_response: result.raw ?? null })
      .eq('payment_key', paymentKey);
    if (recordError) console.error('payments 실패 기록 오류:', recordError);
    console.error('toss 승인 실패:', result.status, result.errorCode, result.errorMessage);
    return c.json({ error: result.errorMessage ?? '결제 승인에 실패했습니다.' }, 502);
  }

  const p = result.payment!;
  const { error: recordError } = await service
    .from('payments')
    .update({
      method: p.method ?? null,
      status: 'DONE',
      requested_at: p.requestedAt ?? null,
      approved_at: p.approvedAt ?? null,
      receipt_url: p.receipt?.url ?? null,
      raw_response: result.raw ?? null,
    })
    .eq('payment_key', paymentKey);
  if (recordError) {
    // 승인은 성공했으므로 사용자에겐 성공 처리 — 기록 실패만 로깅(웹훅/대사로 복구 가능)
    console.error('payments 승인 기록 오류:', recordError);
  }

  // 주문 PAID 전이 — 영향 행 수로 "주문이 사라진 채 출금된" 상황을 감지
  const { data: updated, error: statusError } = await service
    .from('orders')
    .update({ status: 'PAID' })
    .eq('order_id', orderId)
    .eq('status', 'PENDING')
    .select('order_id');
  if (statusError) {
    console.error('orders PAID 전이 오류:', statusError);
    return c.json({ error: '결제는 완료되었으나 주문 상태 갱신에 실패했습니다. 새로고침해 주세요.' }, 500);
  }
  if (!updated?.length) {
    // confirm 도중 주문이 삭제·취소됨 — 결제는 캡처됨. DONE payment 행이 남아 대사로 환불 가능.
    console.error(`payments confirm: 캡처됐으나 PENDING 주문이 없음 (order_id=${orderId}) — 대사 필요`);
    return c.json({ error: '결제가 완료되었으나 주문 확인에 문제가 있습니다. 고객센터로 문의해 주세요.' }, 409);
  }

  // 주문 품목을 장바구니에서 제거 (backend.md §4-5) — 장바구니-결제 모드에서 넘어온 cart_id만.
  // 바로구매(?sku=)·재결제는 cartItemIds가 없어 무동작(따로 담아둔 항목 보존). 실패해도 결제엔 영향 없음.
  if (Array.isArray(body.cartItemIds) && body.cartItemIds.length) {
    const ids = body.cartItemIds.filter((x): x is string => typeof x === 'string' && UUID_RE.test(x)).slice(0, 50);
    if (ids.length) {
      const { error: cartError } = await db.from('cart_items').delete().in('cart_id', ids);
      if (cartError) console.error('결제 후 장바구니 정리 오류:', cartError);
    }
  }

  return c.json({ success: true, orderId, status: 'PAID', receiptUrl: p.receipt?.url ?? null });
});
