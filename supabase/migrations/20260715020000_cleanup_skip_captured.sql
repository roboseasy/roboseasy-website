-- 미결제 정리 정정 (20260714000000_pending_order_cleanup.sql): 캡처됐거나 상태 불명인 결제가 있는
-- PENDING 주문은 자동 취소에서 제외한다.
--   기존 함수는 payments 행이 있으면(status 무관) 24h 후 CANCELLED로 전이했다. 그 결과
--   상태 전이만 실패한 채 캡처된(DONE) 결제나, 네트워크 순단으로 승인 여부가 불명한(IN_PROGRESS)
--   결제가 남은 주문까지 환불 없이 취소돼 돈이 묶일 수 있었다.
--   → 승인 실패(ABORTED)만 있는 주문은 그대로 취소하고, DONE·IN_PROGRESS가 하나라도 있으면
--     자동 취소 대상에서 빼서 대사(수동/웹훅 환불)로 처리한다.
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
    and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.payments p where p.order_id = o.order_id);
  get diagnostics deleted = row_count;

  update public.orders o
  set status = 'CANCELLED'
  where o.status = 'PENDING'
    and o.created_at < now() - interval '24 hours'
    and exists (select 1 from public.payments p where p.order_id = o.order_id)
    and not exists (
      select 1 from public.payments p
      where p.order_id = o.order_id and p.status in ('DONE', 'IN_PROGRESS')
    );
  get diagnostics cancelled = row_count;

  return deleted + cancelled;
end;
$$;
