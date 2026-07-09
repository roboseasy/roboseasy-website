-- 배송 우편번호·상세주소 추가 (카카오 우편번호 서비스 연동)
-- 주소 구성: 우편번호(zipcode) + 기본주소(카카오 검색으로 채움) + 상세주소(직접 입력)
-- 기존 행(단일 주소로 가입한 계정)은 zipcode·detail이 '' — 마이페이지에서 재입력 유도

alter table public.profiles
  add column user_zipcode varchar(10) not null default '',
  add column user_address_detail varchar(255) not null default '';

-- 주문 배송지 스냅샷도 동일 구성 (2차 결제 구현 대비 — 현재 테이블 비어 있음)
alter table public.orders
  add column shipping_zipcode varchar(10) not null default '',
  add column shipping_address_detail varchar(255) not null default '';

-- 가입 트리거 갱신: user_metadata의 우편번호·상세주소도 profiles로 복사
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, user_email, user_name, user_phone, user_zipcode, user_address, user_address_detail, marketing_consent, marketing_consent_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'user_name', ''),
    coalesce(new.raw_user_meta_data ->> 'user_phone', ''),
    coalesce(new.raw_user_meta_data ->> 'user_zipcode', ''),
    coalesce(new.raw_user_meta_data ->> 'user_address', ''),
    coalesce(new.raw_user_meta_data ->> 'user_address_detail', ''),
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false),
    case when coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false) then now() end
  );
  return new;
end;
$$;
