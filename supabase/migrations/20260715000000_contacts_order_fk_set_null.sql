-- contacts.order_id FK에 on delete set null 부여 — backend.md §4·§6
-- 주문 삭제(미결제 PENDING 정리 배치·사용자 취소)가 연계 문의(contacts)의 FK로 막히지 않도록.
-- 문의 이력은 보존하고 주문 링크만 끊는다 (user_id의 on delete set null과 동일 방침).
-- 기존 제약(contacts_order_id_fkey)은 on delete 액션이 없어(NO ACTION = restrict)
-- 링크된 문의가 있는 주문의 DELETE가 23503으로 실패했다.

alter table public.contacts
  drop constraint contacts_order_id_fkey,
  add constraint contacts_order_id_fkey
    foreign key (order_id) references public.orders (order_id) on delete set null;
