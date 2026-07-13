import { createMiddleware } from 'hono/factory';

// CSRF 방어 — 상태 변경 요청(POST/PATCH/PUT/DELETE)의 Origin/Referer를 검증한다.
// 세션이 httpOnly 쿠키(SameSite=Lax)라 브라우저가 교차 사이트 요청에도 쿠키를 자동 첨부할 수 있는데,
// SameSite=Lax는 top-level GET만 막고 예외가 있어(구형 브라우저·일부 내비게이션) 심층 방어로 출처를 확인한다.
// 우리 API의 모든 변경 요청은 자사 페이지에서 fetch로 나가므로 Origin이 항상 붙는다 → 교차 출처 요청을 차단.

// 상태를 바꾸지 않는 메서드는 검증 대상 아님
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// URL 문자열에서 host(도메인:포트)만 추출 — 잘못된 값이면 null
function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export const csrfProtect = createMiddleware(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();

  // 스케줄러 전용 엔드포인트(/api/cron/*)는 pg_net 서버-서버 호출이라 브라우저 Origin이 없고,
  // CRON_SECRET Bearer 토큰으로 이미 인증되므로(추측 불가) CSRF 검증에서 제외.
  if (c.req.path.startsWith('/api/cron/')) return next();

  // Origin 우선, 없으면 Referer로 판정 (구형 브라우저·일부 요청은 Origin 미첨부)
  const source = hostOf(c.req.header('origin')) ?? hostOf(c.req.header('referer'));
  const host = c.req.header('host');

  // 요청의 출처 host가 서비스 host와 일치해야 통과 — prod/localhost 모두 자동 대응
  if (!source || !host || source !== host) {
    return c.json({ error: '요청 출처를 확인할 수 없습니다.' }, 403);
  }
  await next();
});
