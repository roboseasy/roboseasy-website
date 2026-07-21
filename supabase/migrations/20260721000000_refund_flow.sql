-- 환불 플로우 (ORD-16·ADM-08) — 배송 완료 주문의 문의 기반 환불.
-- 유저 셀프 신청 엔드포인트는 두지 않는다: 유저는 환불 문의(contacts, order_id 연계)로 접수하고,
-- 관리자가 PATCH /api/v1/admin/orders/{id}/refund 로 처리한다.
--   REQUEST: DELIVERED → REFUND_REQUESTED (환불 접수 — 반품 회수·검수 대기)
--   APPROVE: REFUND_REQUESTED → REFUNDED (토스 결제 취소 — 전액 또는 반품비 차감 부분취소)
--   REJECT:  REFUND_REQUESTED → DELIVERED 복귀 (REQUEST가 DELIVERED에서만 가능하므로 복귀 상태 저장 불필요)

-- 1) orders.status에 환불 상태 2종 추가
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
	check (status in ('PENDING', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED',
		'REFUND_REQUESTED', 'REFUNDED'));

-- 2) 환불 처리 기록 — 주문 단위 전액(±반품비 차감) 1회 정책이라 별도 테이블 없이 컬럼으로
alter table public.orders
	add column refund_reason varchar(200),      -- REQUEST 시 관리자 입력 (환불 문의 내용 요약)
	add column refund_requested_at timestamptz, -- REQUEST 시각
	add column refunded_at timestamptz,         -- APPROVE(환불 완료) 시각
	add column refund_amount numeric(12,2);     -- 실제 환불액 — 반품비 차감 시 total_price와 다름

-- 3) payments.status에 PARTIAL_CANCELED 추가 — 부분취소(cancelAmount) 시 토스가 반환하는 상태값
alter table public.payments drop constraint payments_status_check;
alter table public.payments add constraint payments_status_check
	check (status in ('READY', 'IN_PROGRESS', 'DONE', 'CANCELED', 'ABORTED', 'EXPIRED',
		'PARTIAL_CANCELED'));
