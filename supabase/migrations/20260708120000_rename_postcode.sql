-- 컬럼명 통일: zipcode → postcode (우편번호)
-- 가입 트리거의 metadata 키도 user_postcode로 변경 (API signUp options.data와 일치)

alter table public.profiles rename column user_zipcode to user_postcode;
alter table public.orders rename column shipping_zipcode to shipping_postcode;

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
