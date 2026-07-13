-- 광고성 정보 수신동의 2년 주기 재확인 (정보통신망법 제50조 / 시행령 제62조의3)
-- 최종 확인 시점 기록용 컬럼. 최초 동의 일시(marketing_consent_at)는 안내문의 '동의 날짜'
-- 표기를 위해 그대로 보존하고, 재확인 안내를 보낼 때마다 marketing_reconfirmed_at을 갱신한다.
alter table public.profiles
  add column marketing_reconfirmed_at timestamptz;

-- 스케줄러가 Hono 엔드포인트(/api/cron/marketing-reconfirm)를 호출해 메일을 발송한다.
-- 메일 발송은 Node/Resend 레이어에서만 가능하므로 Postgres → HTTP 호출용 pg_net을 사용.
-- 인증 토큰(cron_secret)은 소스에 남기지 않기 위해 Supabase Vault에서 읽는다.
--   최초 1회 설정 필요:
--     select vault.create_secret('<CRON_SECRET와 동일한 값>', 'cron_secret');
--   그리고 Netlify 환경변수 CRON_SECRET에 같은 값을 설정.
create extension if not exists pg_net;

-- 매월 1일 04:00 UTC(KST 13:00) 실행 — 2년 경과 대상만 엔드포인트에서 필터링되므로 주기는 넉넉히.
-- 재실행 안전을 위해 기존 job 제거 후 재등록.
do $$
begin
  perform cron.unschedule('marketing-reconfirm-notice');
exception when others then
  null; -- 기존 job이 없으면 무시
end $$;

select cron.schedule(
  'marketing-reconfirm-notice',
  '0 4 1 * *',
  $$
  select net.http_post(
    url := 'https://roboseasy.ai/api/cron/marketing-reconfirm',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  );
  $$
);
