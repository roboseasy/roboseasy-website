-- 주문 생성 경로를 service role 전용으로 전환 (보안 리뷰 2026-07-16 — 금액 위조 심층 방어)
--
-- 기존 orders_insert_own_pending / order_items_insert_own_pending 정책은 소유자·PENDING만
-- 검사하고 금액(total_price·unit_price)은 검증하지 못했다. Hono 서버는 금액을 재계산하지만,
-- 이 정책들이 있으면 SUPABASE_URL + anon key 확보 시 PostgREST 직접 호출로 금액이 조작된
-- 주문(예: total_price=100 + 고가 order_items)을 만들 수 있다 — /payments/confirm은
-- amount == total_price만 검사하므로 100원 결제로 PAID가 성립한다.
--
-- → 주문·품목 insert는 서버(service role, RLS 우회)로만 수행하고(payments·contacts와 동일
--   원칙), 유저 토큰의 직접 insert는 정책 제거로 전면 차단한다 (routes/orders.ts 함께 변경).

drop policy if exists "orders_insert_own_pending" on public.orders;
drop policy if exists "order_items_insert_own_pending" on public.order_items;
