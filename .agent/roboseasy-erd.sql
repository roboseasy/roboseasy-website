-- RoboSEasy 판매 사이트 스키마 v2 (PostgreSQL / Supabase)
-- 원본 roboseasy.sql(v1, MySQL) 대비 변경:
--   1. Users 테이블 제거 — auth.users가 원본, profiles.user_id FK → auth.users(id)
--   2. profiles: user_email(관리자 조회용 복사본, 가입 트리거에서 기록), marketing_consent(+at),
--      약관·개인정보 동의 일시(terms_agreed_at, privacy_agreed_at — 분쟁 시 증빙) 추가
--   3. payments 테이블 신설 — 토스 페이먼츠 승인/취소 기록
--   4. orders: 배송지 스냅샷·운송장·status 정의 추가. 토스 orderId는 별도 컬럼 없이
--      orders.order_id(uuid)를 그대로 사용 (토스 허용 형식: 6~64자 영숫자·-·_)
--   5. FK 전면 보강, cart_items·dibs 중복 담기 방지 UNIQUE
--   6. products: product_price NOT NULL, is_active 추가 (재고 관리 없음 — stock 없음)
--      products는 JSON(Sveltia CMS)이 원본, DB는 주문 FK·금액 검증용 미러 (backend.md §2)
--   7. contacts 테이블 신설 — 문의 기록의 법정 보유기간 관리(일반 1년/불만·분쟁 3년).
--      B2B(기존 /contact 폼)·B2C(판매 사이트, 로그인 전용) 공용 — channel로 구분
-- 명명 규칙: snake_case — Postgres는 따옴표 없는 식별자를 소문자로 접으므로
--   camelCase는 유지 불가(매 쿼리 따옴표 필요). API 응답에서 camelCase로 매핑.
-- 가입 트리거(auth.users insert → profiles 생성)와 RLS 정책은 별도 마이그레이션에서 관리.

create table profiles (
	user_id uuid primary key references auth.users (id) on delete cascade,
	user_email varchar(255) not null unique,
	user_name varchar(100) not null,
	user_phone varchar(20) not null,
	-- 주소: 우편번호 + 기본주소(카카오 우편번호 서비스로 채움) + 상세주소(직접 입력)
	user_postcode varchar(10) not null default '',
	user_address varchar(255) not null,
	user_address_detail varchar(255) not null default '',
	role varchar(20) not null default 'user' check (role in ('user', 'admin')),
	marketing_consent boolean not null default false,
	marketing_consent_at timestamptz, -- 마케팅 동의·철회 일시 — 2년 주기 재확인(정보통신망법) 기준점
	-- 약관·개인정보 동의 증빙 (분리 동의). 가입 시점 = 동의 시점이므로 default now()
	terms_agreed_at timestamptz not null default now(),
	privacy_agreed_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- 원본은 src/data/products.json(Sveltia CMS 관리) — 빌드/배포 시 upsert 동기화되는 미러.
-- json의 id = product_sku. json에서 빠진 제품은 주문 FK 때문에 delete 불가 → is_active=false 처리.
create table products (
	product_sku varchar(50) primary key,
	product_name varchar(200) not null,
	category varchar(100),
	product_price numeric(12,2) not null,
	is_active boolean not null default true,
	description text
);

create table cart_items (
	cart_id uuid primary key default gen_random_uuid(),
	user_id uuid not null references profiles (user_id) on delete cascade,
	product_sku varchar(50) not null references products (product_sku),
	quantity integer not null check (quantity > 0),
	created_at timestamptz not null default now(),
	unique (user_id, product_sku) -- 중복 담기 방지(수량은 quantity로 관리)
);

create table dibs (
	dibs_id uuid primary key default gen_random_uuid(),
	user_id uuid not null references profiles (user_id) on delete cascade,
	product_sku varchar(50) not null references products (product_sku),
	created_at timestamptz not null default now(),
	unique (user_id, product_sku)
);

create table orders (
	order_id uuid primary key default gen_random_uuid(), -- 토스 orderId로 그대로 전달
	-- 거래기록 5년 보관 의무로 cascade 삭제 걸지 않음. 탈퇴 시 주문 이력 있으면
	-- auth 계정·profiles 익명화(이메일 스크램블 + ban, 행 유지), 없으면 hard delete
	-- (backend.md §6 탈퇴 정책)
	user_id uuid not null references profiles (user_id),
	total_price numeric(12,2) not null,
	status varchar(20) not null default 'PENDING'
		check (status in ('PENDING', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED')),
	-- 주문 시점 배송지 스냅샷 (profiles 수정과 무관하게 보존)
	receiver_name varchar(100) not null,
	receiver_phone varchar(20) not null,
	shipping_postcode varchar(10) not null default '',
	shipping_address varchar(255) not null,
	shipping_address_detail varchar(255) not null default '',
	courier varchar(50),
	tracking_number varchar(50),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table order_items (
	oitem_id uuid primary key default gen_random_uuid(),
	order_id uuid not null references orders (order_id) on delete cascade,
	product_sku varchar(50) not null references products (product_sku),
	quantity integer not null check (quantity > 0),
	unit_price numeric(12,2) not null -- 주문 시점 단가 스냅샷
);

-- 문의 기록 — 법정 보유기간 관리용 (일반 1년 / 불만·분쟁 3년, 전자상거래법)
-- 입구는 2개(B2B: /contact 폼·비로그인 허용 / B2C: 판매 사이트·로그인 전용), 저장은 이 테이블 하나.
-- 첨부파일(사업자등록증 등)은 DB에 저장하지 않고 문의 접수 메일 첨부로만 전달
create table contacts (
	contact_id uuid primary key default gen_random_uuid(),
	channel varchar(10) not null default 'b2b' check (channel in ('b2b', 'b2c')),
	-- b2b는 비로그인 가능 → nullable. b2c는 접수 시 항상 기록.
	-- on delete set null: 문의 이력이 회원 hard delete(주문 없는 탈퇴)를 막지 않도록.
	-- 탈퇴 시 본인 문의의 name/email/phone은 별도 처리 — 일반 문의는 익명화,
	-- 분쟁 기록(is_dispute)은 전자상거래법 3년 보존 근거로 유지 (backend.md §6 탈퇴 정책)
	user_id uuid references profiles (user_id) on delete set null,
	order_id uuid references orders (order_id), -- b2c 주문 연계 문의(배송·환불 등) → nullable
	product_sku varchar(50) references products (product_sku), -- b2c 제품 문의 연계 → nullable
	-- b2b: purchase(견적)·as·workshop·corp_edu·etc / b2c: product(제품)·delivery(배송)·as·refund(환불·취소)
	contact_type varchar(20) not null
		check (contact_type in ('purchase', 'as', 'workshop', 'corp_edu', 'etc', 'product', 'delivery', 'refund')),
	name varchar(100) not null, -- b2c는 서버가 profiles에서 채움
	email varchar(255) not null,
	phone varchar(20) not null,
	org varchar(100),
	message text not null,
	is_dispute boolean not null default false, -- 불만·분쟁 여부 → 보유기간 3년/1년 구분
	status varchar(20) not null default 'RECEIVED'
		check (status in ('RECEIVED', 'IN_PROGRESS', 'DONE')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table payments (
	payment_id uuid primary key default gen_random_uuid(),
	-- 주문 1건에 결제 시도 여러 번 가능(실패 후 재시도) → unique 아님
	order_id uuid not null references orders (order_id),
	payment_key varchar(200) not null unique, -- 토스 결제 키(승인/취소 API 호출 키)
	amount numeric(12,2) not null,
	method varchar(30), -- 카드 | 가상계좌 | 간편결제 등 (승인 응답에서 확정)
	status varchar(30) not null -- 토스 상태값 그대로 저장
		check (status in ('READY', 'IN_PROGRESS', 'DONE', 'CANCELED', 'ABORTED', 'EXPIRED')),
	requested_at timestamptz,
	approved_at timestamptz,
	canceled_at timestamptz,
	cancel_reason varchar(200),
	receipt_url varchar(500),
	raw_response jsonb, -- 토스 승인/취소 응답 원본 — 분쟁·대사(reconciliation) 대비
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
