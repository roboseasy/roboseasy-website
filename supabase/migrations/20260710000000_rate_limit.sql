-- Token Bucket rate limit — 서버리스(Netlify Functions) 인스턴스 간 공유 상태.
-- 인메모리는 인스턴스마다 분리되어 한도가 느슨해지므로 DB 테이블 + 원자적 RPC로 관리한다.
--   * per-key 버킷: B2B 문의(IP)·B2C 문의(user_id) 남용 차단
--   * 전역 버킷('global:resend'): Resend 무료 100/day 한도 보호
create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,          -- 'contact:ip:1.2.3.4' / 'inquiry:user:<uuid>' / 'global:resend'
  tokens     double precision not null, -- 현재 잔여 토큰 (충전은 소비 시점에 지연 계산)
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;
-- 정책을 만들지 않음 = anon/authenticated 전면 차단. service role만 아래 RPC로 접근.

-- 원자적 토큰 소비. for update 행 잠금으로 동시 요청을 직렬화(경쟁 조건 방지).
-- 정책값(capacity/refill)은 저장하지 않고 인자로 전달 → 마이그레이션 없이 코드에서 튜닝.
create or replace function public.consume_token(
  p_key            text,
  p_capacity       double precision,
  p_refill_per_sec double precision,
  p_cost           double precision default 1
) returns table(allowed boolean, remaining double precision, retry_after double precision)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now     timestamptz := now();
  v_tokens  double precision;
  v_updated timestamptz;
  v_elapsed double precision;
begin
  -- 행 없으면 '가득 찬' 버킷 생성. 동시 최초요청 경쟁은 on conflict로 흡수.
  insert into public.rate_limit_buckets(bucket_key, tokens, updated_at)
  values (p_key, p_capacity, v_now)
  on conflict (bucket_key) do nothing;

  -- 잠금으로 read-modify-write 직렬화
  select tokens, updated_at into v_tokens, v_updated
  from public.rate_limit_buckets where bucket_key = p_key for update;

  -- 경과 시간만큼 충전 (capacity 상한)
  v_elapsed := extract(epoch from (v_now - v_updated));
  v_tokens  := least(p_capacity, v_tokens + v_elapsed * p_refill_per_sec);

  if v_tokens >= p_cost then
    update public.rate_limit_buckets
      set tokens = v_tokens - p_cost, updated_at = v_now where bucket_key = p_key;
    return query select true, v_tokens - p_cost, 0::double precision;
  else
    -- 거부: 충전 반영분만 저장(계속 충전되도록), 토큰은 차감하지 않음
    update public.rate_limit_buckets
      set tokens = v_tokens, updated_at = v_now where bucket_key = p_key;
    return query select false, v_tokens, (p_cost - v_tokens) / p_refill_per_sec;
  end if;
end;
$$;

-- 클라이언트(PostgREST)를 통한 직접 호출 차단 — 버킷 조작으로 방어를 무력화하지 못하도록.
revoke all on function public.consume_token(text, double precision, double precision, double precision) from public, anon, authenticated;
grant execute on function public.consume_token(text, double precision, double precision, double precision) to service_role;

-- 유휴 버킷 정리 — 가득 찬(=미사용) 버킷은 '버킷 없음'과 동일하므로 하루 지난 건 삭제.
-- 다음 요청 시 가득 찬 상태로 재생성된다. 매일 03:10 UTC(KST 12:10).
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('purge-rate-limit-buckets');
exception when others then
  null; -- 기존 job이 없으면 무시
end $$;

select cron.schedule(
  'purge-rate-limit-buckets',
  '10 3 * * *',
  $$delete from public.rate_limit_buckets where updated_at < now() - interval '1 day';$$
);
