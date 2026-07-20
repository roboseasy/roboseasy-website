-- 미결제(PENDING) 정리 주기 단축 — 24시간 → 2시간, cron 15분 간격.
-- 배경: 주문서 이탈 시 클라이언트가 즉시 정리(POST /orders/:id/cancel?mode=abandon)를 쏘지만,
--   탭 강제 종료·네트워크 끊김·모바일 백그라운드 종료 등으로 그 요청이 유실될 수 있다.
--   배치가 그 누락분을 회수하는 안전망이므로 24시간은 지나치게 길었다.
-- 2시간을 고른 이유: 주문서를 열어 둔 채 오래 머무는 사용자의 주문이 결제 직전에 사라지지 않도록
--   여유를 둔 값. 1시간으로 줄이면 장시간 작성 중인 주문이 지워져 confirm이 "주문 없음"으로 실패할 수 있다.
-- 판정 로직(캡처된 결제 보호)은 20260715020000_cleanup_skip_captured.sql과 동일하게 유지한다.
create or replace function public.cleanup_pending_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted integer;
  cancelled integer;
begin
  delete from public.orders o
  where o.status = 'PENDING'
    and o.created_at < now() - interval '2 hours'
    and not exists (select 1 from public.payments p where p.order_id = o.order_id);
  get diagnostics deleted = row_count;

  update public.orders o
  set status = 'CANCELLED'
  where o.status = 'PENDING'
    and o.created_at < now() - interval '2 hours'
    and exists (select 1 from public.payments p where p.order_id = o.order_id)
    and not exists (
      select 1 from public.payments p
      where p.order_id = o.order_id and p.status in ('DONE', 'IN_PROGRESS')
    );
  get diagnostics cancelled = row_count;

  return deleted + cancelled;
end;
$$;

-- 15분 간격으로 재등록 (기존 '30 * * * *' 스케줄 교체)
do $$
begin
  perform cron.unschedule('cleanup-pending-orders');
exception when others then
  null; -- 기존 job이 없으면 무시
end $$;

select cron.schedule(
  'cleanup-pending-orders',
  '*/15 * * * *',
  $$select public.cleanup_pending_orders();$$
);
