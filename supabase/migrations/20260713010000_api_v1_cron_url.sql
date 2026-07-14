-- API URL 버저닝(/api/* → /api/v1/*)에 따른 pg_cron 호출 URL 갱신.
-- marketing-reconfirm-notice job은 20260709020000에서 /api/cron/marketing-reconfirm으로
-- 등록·적용되어 있으므로, 새 경로(/api/v1/cron/marketing-reconfirm)로 재등록한다.
-- 스케줄·인증(Vault cron_secret) 방식은 원본 마이그레이션과 동일.
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
    url := 'https://roboseasy.ai/api/v1/cron/marketing-reconfirm',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  );
  $$
);
