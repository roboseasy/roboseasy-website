import { getEnv } from './env';

// 토스페이먼츠 코어 API 클라이언트 — 승인·취소만 사용 (backend.md §4 결제 플로우).
// 인증: 시크릿 키 Basic (base64("{secretKey}:")). 위젯(클라이언트 키)은 프론트에서 로드.
const TOSS_API = 'https://api.tosspayments.com/v1';

export interface TossPayment {
  paymentKey: string;
  orderId: string;
  status: string; // READY | IN_PROGRESS | DONE | CANCELED | ABORTED | EXPIRED
  totalAmount: number;
  method: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  receipt: { url: string } | null;
  [key: string]: unknown; // raw_response(jsonb) 저장용 — 전체 응답 보존
}

export interface TossResult {
  ok: boolean;
  status: number;
  /** ok=true면 결제 객체, false면 토스 오류 응답 {code, message} */
  payment: TossPayment | null;
  errorCode: string | null;
  errorMessage: string | null;
  raw: unknown;
}

async function tossFetch(
  path: string,
  body: Record<string, unknown> | null,
  method: 'GET' | 'POST' = 'POST'
): Promise<TossResult | null> {
  const secretKey = getEnv('TOSS_SECRET_KEY');
  if (!secretKey) {
    console.error('[toss] TOSS_SECRET_KEY 미설정 — 결제 기능 비활성');
    return null;
  }
  let res: Response;
  try {
    res = await fetch(`${TOSS_API}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    // 네트워크 순단(타임아웃·DNS 등) — 전역 onError로 던지지 않고 결제 문맥 오류로 반환.
    // 호출자(payments)가 선점 행을 ABORTED로 남기고 사용자에게 재시도를 안내할 수 있도록.
    console.error('[toss] 네트워크 오류:', err);
    return {
      ok: false,
      status: 0,
      payment: null,
      errorCode: 'NETWORK_ERROR',
      errorMessage: '결제 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      raw: null,
    };
  }
  const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return {
    ok: res.ok,
    status: res.status,
    payment: res.ok ? (raw as unknown as TossPayment) : null,
    errorCode: !res.ok ? ((raw?.code as string) ?? null) : null,
    errorMessage: !res.ok ? ((raw?.message as string) ?? null) : null,
    raw,
  };
}

/** 결제 승인 — 위젯 인증 성공 후 successUrl에서 받은 값으로 호출 */
export function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  return tossFetch('/payments/confirm', { paymentKey, orderId, amount });
}

/** 결제 취소 — cancelAmount 미지정 시 전액, 지정 시 부분취소(반품비 차감 환불용) */
export function cancelPayment(paymentKey: string, cancelReason: string, cancelAmount?: number) {
  return tossFetch(`/payments/${encodeURIComponent(paymentKey)}/cancel`, {
    cancelReason,
    ...(cancelAmount != null ? { cancelAmount } : {}),
  });
}

/** 결제 조회 — confirm 결과가 불확실할 때(네트워크 순단 등) 토스의 실제 상태를 확인해 이중청구 방지 */
export function getPayment(paymentKey: string) {
  return tossFetch(`/payments/${encodeURIComponent(paymentKey)}`, null, 'GET');
}
