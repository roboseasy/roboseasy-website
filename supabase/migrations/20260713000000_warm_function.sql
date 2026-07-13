-- Netlify Function 워밍 핑 — 콜드 스타트 방지
-- 트래픽이 적으면 함수 인스턴스가 유휴 5~15분 사이에 회수되어 첫 방문자가 매번
-- ~2초 콜드 스타트를 맞는다(실측: 콜드 2.1s / 웜 0.6s). 회수 주기보다 짧은 5분 간격으로
-- /api/health(무인증 GET)를 호출해 인스턴스를 항상 깨어 있게 유지한다.
-- 비용: 월 ~8,600회 호출 — Netlify 무료 티어 한도(125k/월) 내에서 미미.
-- 참고: 테스트 DB에 적용해도 대상이 프로덕션 URL이라 핑이 중복될 뿐 무해함.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 재실행 안전을 위해 기존 job 제거 후 재등록.
do $$
begin
  perform cron.unschedule('warm-netlify-function');
exception when others then
  null; -- 기존 job이 없으면 무시
end $$;

select cron.schedule(
  'warm-netlify-function',
  '*/5 * * * *',
  $$select net.http_get(url := 'https://roboseasy.ai/api/health');$$
);
