-- RoboSEasy 판매 사이트 — 트리거·함수·RLS 정책·pg_cron 배치 (PostgreSQL / Supabase)
--
-- [2026-07-28 스쿼시] 기존 마이그레이션 17개(20260706162814 ~ 20260721000000)와
-- .agent/roboseasy-trigger-rls.sql을 '최종 상태' 하나로 합친 기준 파일이다.
-- 실행 순서: 20260706162814_init_schema.sql(스키마) 적용 후 본 파일 실행.
--
-- 전제:
--   * Hono 서버는 일반 요청 시 유저 세션 토큰으로 Supabase 클라이언트 생성 → RLS 적용됨
--   * 결제 승인/취소, 주문 생성·상태 전이, 회원탈퇴, 문의 기록 등은 service role 키 사용 → RLS 우회
--   * service role·테이블 소유자는 RLS를 우회하므로 별도 정책 불필요

-- ============================================================
-- 1. 가입 트리거: auth.users insert → profiles 자동 생성
--    가입 폼의 이름/전화/주소/마케팅 동의는 signUp()의 options.data로 전달
--    → raw_user_meta_data에서 복사. 이메일은 auth.users.email 복사.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, user_email, user_name, user_phone, user_postcode, user_address, user_address_detail, marketing_consent, marketing_consent_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'user_name', ''),
    coalesce(new.raw_user_meta_data ->> 'user_phone', ''),
    coalesce(new.raw_user_meta_data ->> 'user_postcode', ''),
    coalesce(new.raw_user_meta_data ->> 'user_address', ''),
    coalesce(new.raw_user_meta_data ->> 'user_address_detail', ''),
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false),
    case when coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false) then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. updated_at 자동 갱신 트리거
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger set_contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

create trigger set_deliveries_updated_at
  before update on public.deliveries
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2-1. profiles.user_email 변경 차단 트리거
--      이메일은 수정 불가(USR-03) — API 레이어 차단에 더해 DB 레벨에서 강제.
--      트리거는 service role 포함 모든 update에 적용됨.
--      예외: 회원탈퇴 익명화 패턴(deleted-{user_id}@removed.invalid)으로의
--      변경만 허용 — 주문 이력 있는 회원의 개인정보 파기 경로(backend.md §6 탈퇴 정책).
--      익명값은 user_id 기반이라 UNIQUE 제약과 충돌하지 않음.
--      (그 외 변경이 필요한 운영 상황에서는 트리거 drop 후 수정)
-- ============================================================

create or replace function public.prevent_user_email_change()
returns trigger
language plpgsql
as $$
begin
  if new.user_email is distinct from old.user_email
     and new.user_email !~ '^deleted-[0-9a-f-]{36}@removed\.invalid$' then
    raise exception 'user_email is immutable (USR-03) — 탈퇴 익명화 패턴으로의 변경만 허용';
  end if;
  return new;
end;
$$;

create trigger prevent_profiles_email_change
  before update on public.profiles
  for each row execute function public.prevent_user_email_change();

-- ============================================================
-- 3. 관리자 판별 함수
--    profiles 정책 안에서 profiles를 직접 조회하면 정책 재귀가 발생하므로
--    security definer 함수(소유자 권한 실행 → RLS 우회)로 분리
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ============================================================
-- 4. RLS 활성화
--    rate_limit_buckets는 정책을 만들지 않음 = anon/authenticated 전면 차단
--    (service role만 아래 consume_token RPC로 접근)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.dibs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.contacts enable row level security;
alter table public.deliveries enable row level security;
alter table public.rate_limit_buckets enable row level security;

-- ============================================================
-- 5. 정책
--    auth.uid()는 (select auth.uid())로 감싸 행마다 재평가 방지 (Supabase 권장)
-- ============================================================

-- profiles ---------------------------------------------------
-- insert: 가입 트리거(security definer)가 생성 — 유저 직접 insert 불허
-- delete: 회원탈퇴는 service role의 auth.admin.deleteUser() → cascade — 정책 불필요

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (user_id = (select auth.uid()) or public.is_admin());

-- with check의 role = 'user': 일반 유저의 role 자기 승격 차단
-- (관리자 자신의 수정은 아래 admin 정책으로 허용. 이메일 변경은 2-1 트리거가 차단)
create policy "profiles_update_own"
  on public.profiles for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and role = 'user');

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- products ---------------------------------------------------
-- 상품 목록은 비로그인 포함 전체 공개, 등록·수정은 관리자만

create policy "products_select_all"
  on public.products for select
  using (true);

create policy "products_insert_admin"
  on public.products for insert
  with check (public.is_admin());

create policy "products_update_admin"
  on public.products for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_delete_admin"
  on public.products for delete
  using (public.is_admin());

-- cart_items -------------------------------------------------

create policy "cart_items_select_own"
  on public.cart_items for select
  using (user_id = (select auth.uid()));

create policy "cart_items_insert_own"
  on public.cart_items for insert
  with check (user_id = (select auth.uid()));

create policy "cart_items_update_own"
  on public.cart_items for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "cart_items_delete_own"
  on public.cart_items for delete
  using (user_id = (select auth.uid()));

-- dibs -------------------------------------------------------

create policy "dibs_select_own"
  on public.dibs for select
  using (user_id = (select auth.uid()));

create policy "dibs_insert_own"
  on public.dibs for insert
  with check (user_id = (select auth.uid()));

create policy "dibs_delete_own"
  on public.dibs for delete
  using (user_id = (select auth.uid()));

-- deliveries -------------------------------------------------
-- 본인 행만. 관리자 조회 대상이 아니므로 admin 예외 없음(cart_items·dibs와 동일).

create policy "deliveries_select_own"
  on public.deliveries for select
  using (user_id = (select auth.uid()));

create policy "deliveries_insert_own"
  on public.deliveries for insert
  with check (user_id = (select auth.uid()));

create policy "deliveries_update_own"
  on public.deliveries for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "deliveries_delete_own"
  on public.deliveries for delete
  using (user_id = (select auth.uid()));

-- orders -----------------------------------------------------
-- insert: 정책 없음 = 유저 토큰 직접 insert 전면 차단 (보안 리뷰 2026-07-16 — 금액 위조 심층 방어).
--   소유자·PENDING만 검사하는 정책으로는 total_price·unit_price를 검증할 수 없어,
--   anon key 확보 시 PostgREST 직접 호출로 금액이 조작된 주문을 만들 수 있었다
--   (/payments/confirm은 amount == total_price만 검사 → 100원 결제로 PAID 성립).
--   → 주문·품목 생성은 서버(service role, RLS 우회) 전용 (payments·contacts와 동일 원칙).
-- update: 상태 전이(PAID/CANCELLED/REFUNDED 등)는 service role, 배송 관리는 관리자
-- delete: 없음 — 주문 취소는 상태 변경으로 처리 (미결제 정리 배치만 service role로 삭제)

create policy "orders_select_own_or_admin"
  on public.orders for select
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "orders_update_admin"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- order_items ------------------------------------------------
-- 부모 주문의 소유자 기준으로 접근 제어. insert는 orders와 같은 이유로 service role 전용.

create policy "order_items_select_own_or_admin"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.order_id = order_items.order_id
        and (o.user_id = (select auth.uid()) or public.is_admin())
    )
  );

-- payments ---------------------------------------------------
-- 생성·갱신은 결제 승인/취소를 처리하는 서버(service role) 전용 — 정책 없음 = 차단
-- 조회만 본인 주문 건 또는 관리자에게 허용

create policy "payments_select_own_or_admin"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.order_id = payments.order_id
        and (o.user_id = (select auth.uid()) or public.is_admin())
    )
  );

-- contacts ---------------------------------------------------
-- insert: 서버(/api/v1/contact = b2b, /api/v1/inquiries = b2c)가 service role로 기록 — 정책 없음 = 직접 접근 차단
-- 조회: 관리자는 전체, 일반 회원은 본인의 b2c 문의만(마이페이지)
-- 상태 변경(처리 현황, 분쟁 표시)은 관리자만

create policy "contacts_select_admin"
  on public.contacts for select
  using (public.is_admin());

create policy "contacts_select_own_b2c"
  on public.contacts for select
  using (channel = 'b2c' and user_id = (select auth.uid()));

create policy "contacts_update_admin"
  on public.contacts for update
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 6. Rate limit RPC
--    원자적 토큰 소비. for update 행 잠금으로 동시 요청을 직렬화(경쟁 조건 방지).
--    정책값(capacity/refill)은 저장하지 않고 인자로 전달 → 마이그레이션 없이 코드에서 튜닝.
-- ============================================================

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

-- ============================================================
-- 7. 배치 함수
-- ============================================================

-- 7-1. 개인정보 보유기간 자동 파기 (개인정보처리방침 제3조·제7조)
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

-- 7-2. 미결제(PENDING) 주문 정리 — backend.md §4 확정 사항
-- 위젯 이탈은 서버가 관측할 수 없으므로 시간 기반 정리: 생성 후 2시간 경과한 PENDING 중
--   ① payments 행 없음 → DELETE (order_items는 CASCADE — 계약 미성립 건이라 보존 의무 없음)
--   ② 승인 실패(ABORTED 등)만 있음 → CANCELLED 전이 (결제사 대사·분쟁 기록 보존)
--   ③ DONE·IN_PROGRESS가 하나라도 있음 → 대상에서 제외. 캡처된 결제나 승인 여부가 불명한 건이
--      환불 없이 취소돼 돈이 묶이는 것을 막고, 수동/웹훅 환불 대사로 넘긴다.
-- confirm의 PENDING 가드가 안전망: 삭제된 orderId로 늦게 도착한 승인 요청은 "주문 없음"으로 거부됨.
-- 2시간을 고른 이유: 주문서 이탈 시 클라이언트가 즉시 정리 요청을 쏘지만 탭 강제 종료·네트워크 끊김
--   등으로 유실될 수 있어 배치가 회수한다. 1시간이면 장시간 작성 중인 주문이 지워져 confirm이 실패할 수 있다.
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

-- ============================================================
-- 8. pg_cron 배치 등록
--    Supabase Pro는 pg_cron 사용 가능. 프로젝트에서 최초 1회 대시보드(Database > Extensions)
--    또는 아래 create extension으로 활성화 필요. 재실행 안전을 위해 기존 job 제거 후 재등록.
--    pg_net은 Postgres → HTTP 호출용 (메일 발송은 Node/Resend 레이어에서만 가능).
--    인증 토큰(cron_secret)은 소스에 남기지 않기 위해 Supabase Vault에서 읽는다.
--      최초 1회 설정 필요:
--        select vault.create_secret('<CRON_SECRET와 동일한 값>', 'cron_secret');
--      그리고 Netlify 환경변수 CRON_SECRET에 같은 값을 설정.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('purge-expired-contacts');
exception when others then
  null; -- 기존 job이 없으면 무시
end $$;

do $$
begin
  perform cron.unschedule('cleanup-pending-orders');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('purge-rate-limit-buckets');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('marketing-reconfirm-notice');
exception when others then
  null;
end $$;

-- 문의 보유기간 파기 — 매일 03:00 UTC(KST 12:00)
select cron.schedule(
  'purge-expired-contacts',
  '0 3 * * *',
  $$select public.purge_expired_contacts();$$
);

-- 미결제 주문 정리 — 15분 간격
select cron.schedule(
  'cleanup-pending-orders',
  '*/15 * * * *',
  $$select public.cleanup_pending_orders();$$
);

-- 유휴 rate limit 버킷 정리 — 가득 찬(=미사용) 버킷은 '버킷 없음'과 동일하므로 하루 지난 건 삭제.
-- 다음 요청 시 가득 찬 상태로 재생성된다. 매일 03:10 UTC(KST 12:10).
select cron.schedule(
  'purge-rate-limit-buckets',
  '10 3 * * *',
  $$delete from public.rate_limit_buckets where updated_at < now() - interval '1 day';$$
);

-- 마케팅 수신동의 2년 재확인 안내 — 매월 1일 04:00 UTC(KST 13:00).
-- 2년 경과 대상만 엔드포인트에서 필터링되므로 주기는 넉넉히.
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
