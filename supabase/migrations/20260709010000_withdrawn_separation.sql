-- 탈퇴 회원 거래기록의 논리적 분리 보관 (개인정보처리방침 제3조·제7조)
-- 표준 개인정보 보호지침 제10조: 법정 보존 데이터는 물리적 '또는 논리적'으로
-- 분리하여 저장·관리 가능. 주문 이력이 있어 익명화 경로로 탈퇴한 회원의 profiles 행을
-- withdrawn_at으로 표시 → 운영(활성 회원 목록) 조회에서 분리. orders/payments는
-- 익명화된 profiles를 통해서만 연결되어 개인 식별정보와 분리 보존된다.

alter table public.profiles
  add column withdrawn_at timestamptz;

-- 활성 회원 목록 조회용 부분 인덱스 (withdrawn_at IS NULL — 운영 목록의 기본 필터)
create index profiles_active_idx
  on public.profiles (created_at desc)
  where withdrawn_at is null;
