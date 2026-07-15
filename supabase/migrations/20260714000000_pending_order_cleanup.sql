-- 미결제(PENDING) 주문 정리 — backend.md §4 확정 사항
-- 위젯 이탈은 서버가 관측할 수 없으므로 시간 기반 정리: 생성 후 24시간 경과한 PENDING 중
--   ① payments 행 없음 → DELETE (order_items는 CASCADE — 계약 미성립 건이라 보존 의무 없음)
--   ② payments 행 있음(승인 실패 등) → CANCELLED 전이 (결제사 대사·분쟁 기록 보존, payments FK도 삭제를 막음)
-- confirm의 PENDING 가드가 안전망: 삭제된 orderId로 늦게 도착한 승인 요청은 "주문 없음"으로 거부됨.

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
    and exists (select 1 from public.payments p where p.order_id = o.order_id);
  get diagnostics cancelled = row_count;

  return deleted + cancelled;
end;
$$;

-- 매시간 30분 실행 (다른 배치와 시각 분산). 재실행 안전을 위해 기존 job 제거 후 재등록.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('cleanup-pending-orders');
exception when others then
  null; -- 기존 job이 없으면 무시
end $$;

select cron.schedule(
  'cleanup-pending-orders',
  '30 * * * *',
  $$select public.cleanup_pending_orders();$$
);
