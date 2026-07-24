// 주문 상태 한글 라벨 — 주문 내역(orders)과 관리자 주문 관리(manage)가 공유하는 단일 원본.
// 배지 스타일(클래스)은 페이지별로 다르므로 각 페이지가 별도로 관리한다.
export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  SHIPPING: '배송 중',
  DELIVERED: '배송 완료',
  CANCELLED: '취소됨',
  REFUND_REQUESTED: '환불 접수',
  REFUNDED: '환불 완료',
};
