-- 브랜드명 변경에 따른 product_sku·product_name·category 이전
--   so-arm101-max → a-ba-max  /  "LeRobot SO-ARM101 MAX" → "A-Ba(SO-ARM101) MAX"
--   lekiwi        → a-go      /  "LeKiWi"                → "A-Go(LeKiwi)"
--
-- product_sku는 products의 PK이고 cart_items·dibs·order_items·contacts가 참조한다.
-- 초기 스키마의 FK에는 on update cascade가 없어 PK를 그대로 바꿀 수 없으므로,
-- FK를 걷어내고 부모·자식을 함께 갱신한 뒤 on update cascade를 붙여 재생성한다
-- (이후 sku 변경은 자동 전파).
--
-- 새 sku로 행을 추가하지 않고 제자리에서 옮기는 이유: sync-products(JSON→DB upsert)는
-- JSON에서 사라진 sku를 주문 FK 때문에 삭제하지 못하고 is_active=false로만 두므로,
-- 신규 행 방식이면 장바구니·찜이 비활성 제품을 가리키게 되고 카탈로그에 유령 행이 남는다.
-- 제자리 이전이면 장바구니·찜·주문이 모두 그대로 따라온다.
--
-- 순서 주의: 이 마이그레이션이 배포 빌드의 sync-products보다 먼저 적용되어야
-- upsert가 새 행을 만들지 않고 기존 행을 갱신한다.

begin;

alter table cart_items  drop constraint cart_items_product_sku_fkey;
alter table dibs        drop constraint dibs_product_sku_fkey;
alter table order_items drop constraint order_items_product_sku_fkey;
alter table contacts    drop constraint contacts_product_sku_fkey;

-- 부모 먼저 (FK가 없는 상태라 순서 자체는 무관하지만 의도를 드러내기 위해 부모→자식 순)
update products set product_sku = 'a-ba-max', product_name = 'A-Ba(SO-ARM101) MAX'
 where product_sku = 'so-arm101-max';
update products set product_sku = 'a-go',     product_name = 'A-Go(LeKiwi)'
 where product_sku = 'lekiwi';

-- category는 FK가 아닌 단순 문자열 미러 (src/data/products.ts의 ProductCategory와 일치시킨다)
update products set category = 'a-ba' where category = 'so-arm101';
update products set category = 'a-go' where category = 'lekiwi';

update cart_items  set product_sku = 'a-ba-max' where product_sku = 'so-arm101-max';
update cart_items  set product_sku = 'a-go'     where product_sku = 'lekiwi';
update dibs        set product_sku = 'a-ba-max' where product_sku = 'so-arm101-max';
update dibs        set product_sku = 'a-go'     where product_sku = 'lekiwi';
update order_items set product_sku = 'a-ba-max' where product_sku = 'so-arm101-max';
update order_items set product_sku = 'a-go'     where product_sku = 'lekiwi';
update contacts    set product_sku = 'a-ba-max' where product_sku = 'so-arm101-max';
update contacts    set product_sku = 'a-go'     where product_sku = 'lekiwi';

alter table cart_items  add constraint cart_items_product_sku_fkey
	foreign key (product_sku) references products (product_sku) on update cascade;
alter table dibs        add constraint dibs_product_sku_fkey
	foreign key (product_sku) references products (product_sku) on update cascade;
alter table order_items add constraint order_items_product_sku_fkey
	foreign key (product_sku) references products (product_sku) on update cascade;
alter table contacts    add constraint contacts_product_sku_fkey
	foreign key (product_sku) references products (product_sku) on update cascade;

-- 잔여 참조가 없는지 확인 — 하나라도 남으면 롤백
do $$
declare
	leftover integer;
begin
	select count(*) into leftover from (
		select 1 from products    where product_sku in ('so-arm101-max', 'lekiwi')
		union all select 1 from cart_items  where product_sku in ('so-arm101-max', 'lekiwi')
		union all select 1 from dibs        where product_sku in ('so-arm101-max', 'lekiwi')
		union all select 1 from order_items where product_sku in ('so-arm101-max', 'lekiwi')
		union all select 1 from contacts    where product_sku in ('so-arm101-max', 'lekiwi')
	) t;
	if leftover > 0 then
		raise exception '옛 product_sku가 % 건 남아 있음 — 롤백', leftover;
	end if;
end $$;

commit;
