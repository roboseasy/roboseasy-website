-- 배송지 주소록 (deliveries) — 회원이 저장해 두고 주문서에서 불러 쓰는 배송지 목록.
-- orders의 배송지 5필드는 '주문 시점 스냅샷'으로 그대로 유지한다(계약 증빙).
-- 여기 행을 나중에 수정·삭제해도 이미 접수된 주문의 배송지는 변하지 않는다.
create table public.deliveries (
	delivery_id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (user_id) on delete cascade,
	delivery_label varchar(50), -- 배송지명(집·회사 등) — 선택
	receiver_name varchar(100) not null,
	receiver_phone varchar(20) not null,
	postcode varchar(10) not null,
	address varchar(255) not null,
	address_detail varchar(255) not null default '', -- 선택 — 미입력 시 빈 문자열(orders와 동일 규약)
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- 목록은 항상 본인 것만 최신순 조회 — user_id 단독 인덱스로 충분(회원당 최대 5건)
create index deliveries_user_id_idx on public.deliveries (user_id);

create trigger set_deliveries_updated_at
	before update on public.deliveries
	for each row execute function public.set_updated_at();

-- RLS — 본인 행만. 관리자 조회 대상이 아니므로 admin 예외 없음(cart_items·dibs와 동일).
alter table public.deliveries enable row level security;

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
