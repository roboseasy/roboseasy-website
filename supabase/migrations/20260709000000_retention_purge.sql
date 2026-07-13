-- 개인정보 보유기간 자동 파기 (개인정보처리방침 제3조·제7조)
--   * 문의(contacts): 일반(비분쟁) 처리 완료 후 1년, 불만·분쟁 기록 3년 경과 시 파기
--   * 접속 로그(3개월)는 Netlify/Supabase 인프라 레벨 보존이라 앱 DB 파기 대상 아님
-- 기준 시각은 updated_at(마지막 처리 시점) — 아직 처리 중이거나 최근 처리된 건은 보존.
-- 파기는 hard delete. 탈퇴 익명화로 개인정보가 이미 제거된 일반 문의도 함께 만료 삭제됨.

create or replace function public.purge_expired_contacts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer;
begin
  delete from public.contacts
  where (is_dispute = false and updated_at < now() - interval '1 year')
     or (is_dispute = true  and updated_at < now() - interval '3 years');
  get diagnostics purged = row_count;
  return purged;
end;
$$;

-- pg_cron 배치 등록 — 매일 03:00 UTC(KST 12:00) 실행.
-- Supabase Pro는 pg_cron 사용 가능. 프로젝트에서 최초 1회 대시보드(Database > Extensions)
-- 또는 아래 create extension으로 활성화 필요. 재실행 안전을 위해 기존 job 제거 후 재등록.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('purge-expired-contacts');
exception when others then
  null; -- 기존 job이 없으면 무시
end $$;

select cron.schedule(
  'purge-expired-contacts',
  '0 3 * * *',
  $$select public.purge_expired_contacts();$$
);
