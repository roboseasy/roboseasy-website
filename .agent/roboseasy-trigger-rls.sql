-- RoboSEasy 판매 사이트 — 가입 트리거 + RLS 정책 (PostgreSQL / Supabase)
-- 실행 순서: roboseasy-erd.sql(스키마) 적용 후 본 파일 실행
--
-- 전제:
--   * Hono 서버는 일반 요청 시 유저 세션 토큰으로 Supabase 클라이언트 생성 → RLS 적용됨
--   * 결제 승인/취소, 회원탈퇴, 주문 상태 전이 등은 service role 키 사용 → RLS 우회
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
-- ============================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.dibs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.contacts enable row level security;

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

-- orders -----------------------------------------------------
-- insert: 본인 주문 + PENDING 상태로만 생성 (금액은 서버가 재계산해 넣음)
-- update: 상태 전이(PAID/CANCELLED 등)는 service role, 배송 관리는 관리자
-- delete: 없음 — 주문 취소는 상태 변경으로 처리

create policy "orders_select_own_or_admin"
  on public.orders for select
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "orders_insert_own_pending"
  on public.orders for insert
  with check (user_id = (select auth.uid()) and status = 'PENDING');

create policy "orders_update_admin"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- order_items ------------------------------------------------
-- 부모 주문의 소유자 기준으로 접근 제어

create policy "order_items_select_own_or_admin"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.order_id = order_items.order_id
        and (o.user_id = (select auth.uid()) or public.is_admin())
    )
  );

-- insert: 본인의 PENDING 주문에만 품목 추가 가능 (주문 생성 시점)
create policy "order_items_insert_own_pending"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.order_id = order_items.order_id
        and o.user_id = (select auth.uid())
        and o.status = 'PENDING'
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
-- insert: 서버(/api/contact = b2b, /api/inquiries = b2c)가 service role로 기록 — 정책 없음 = 직접 접근 차단
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
