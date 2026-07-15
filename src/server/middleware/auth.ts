import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { createAnonClient, createUserClient } from '../lib/supabase';

// 세션은 httpOnly 쿠키로만 관리 — 클라이언트 JS에서 접근 불가 (backend.md §1 인증 방식)
const ACCESS_COOKIE = 'sb-access-token';
const REFRESH_COOKIE = 'sb-refresh-token';

const cookieBase = {
  httpOnly: true,
  secure: import.meta.env.PROD, // 로컬(http)에서는 secure 쿠키가 저장되지 않으므로 prod에서만
  sameSite: 'Lax' as const,
  path: '/',
};

// 로그인 상태 표시용 쿠키 — httpOnly가 아니라 헤더 JS가 읽음. 값에 민감정보 없음(단순 플래그)
const INDICATOR_COOKIE = 'rb-auth';
// "로그인 유지" 선택 저장 — 리프레시 시 쿠키 지속성(세션 전용 vs 30일)을 결정하는 데 사용
const REMEMBER_COOKIE = 'rb-remember';
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30일 — 리프레시 토큰으로 세션 연장

// remember=true(로그인 유지): maxAge 부여로 브라우저를 닫아도 유지(최대 30일).
// remember=false: maxAge 없는 세션 쿠키 → 브라우저 종료 시 만료(공용 PC 대비).
// remember 생략(리프레시 경로)이면 기존 선택을 rb-remember에서 읽음 — 구 세션(쿠키 없음)은 지속으로 간주(호환).
export function setSessionCookies(c: Context, session: Session, remember?: boolean) {
  const persist = remember ?? getCookie(c, REMEMBER_COOKIE) !== '0';
  const persistOpts = persist ? { maxAge: REFRESH_MAX_AGE } : {};

  setCookie(c, ACCESS_COOKIE, session.access_token, {
    ...cookieBase,
    ...(persist ? { maxAge: session.expires_in ?? 3600 } : {}),
  });
  setCookie(c, REFRESH_COOKIE, session.refresh_token, { ...cookieBase, ...persistOpts });
  setCookie(c, INDICATOR_COOKIE, '1', { ...cookieBase, httpOnly: false, ...persistOpts });
  setCookie(c, REMEMBER_COOKIE, persist ? '1' : '0', { ...cookieBase, ...persistOpts });
}

export function clearSessionCookies(c: Context) {
  deleteCookie(c, ACCESS_COOKIE, { path: '/' });
  deleteCookie(c, REFRESH_COOKIE, { path: '/' });
  deleteCookie(c, INDICATOR_COOKIE, { path: '/' });
  deleteCookie(c, REMEMBER_COOKIE, { path: '/' });
}

export function getSessionTokens(c: Context) {
  return {
    accessToken: getCookie(c, ACCESS_COOKIE),
    refreshToken: getCookie(c, REFRESH_COOKIE),
  };
}

/** requireAuth를 통과한 핸들러가 쓰는 컨텍스트 변수 */
export type AuthEnv = {
  Variables: {
    user: User;
    /** RLS가 적용되는 유저 토큰 클라이언트 */
    db: SupabaseClient;
    accessToken: string;
  };
};

// GoTrue 일시 장애(네트워크·5xx·타임아웃) 판별 — supabase-js는 이 경우 throw하지 않고
// AuthRetryableFetchError를 error로 반환한다. 토큰 무효(401/403 등)와 구분해, 장애 시엔
// 멀쩡한 세션 쿠키를 지우지 않고 503을 반환(전원 강제 로그아웃 방지).
function isAuthServiceDown(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; status?: number };
  if (e.name === 'AuthRetryableFetchError') return true;
  return typeof e.status === 'number' && (e.status === 0 || e.status === 408 || e.status === 429 || e.status >= 500);
}

// 세션 검증 미들웨어 — 실패 시 401. 인증 서버 일시 장애는 503(쿠키 유지).
// 액세스 토큰 만료면 리프레시 토큰으로 갱신 후 새 쿠키 발급(로그인 유지).
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const { accessToken, refreshToken } = getSessionTokens(c);
  if (!accessToken && !refreshToken) {
    return c.json({ error: '로그인이 필요합니다.' }, 401);
  }

  const anon = createAnonClient();
  if (!anon) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  const serviceDown = () =>
    c.json({ error: '인증 서버에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, 503);

  let token = accessToken;
  let user: User | null = null;

  if (token) {
    const { data, error } = await anon.auth.getUser(token);
    if (isAuthServiceDown(error)) return serviceDown();
    user = data.user;
  }

  if (!user && refreshToken) {
    const { data, error } = await anon.auth.refreshSession({ refresh_token: refreshToken });
    if (isAuthServiceDown(error)) return serviceDown();
    if (data.session && data.user) {
      setSessionCookies(c, data.session);
      token = data.session.access_token;
      user = data.user;
    }
  }

  if (!user || !token) {
    clearSessionCookies(c);
    return c.json({ error: '세션이 만료되었습니다. 다시 로그인해 주세요.' }, 401);
  }

  const db = createUserClient(token);
  if (!db) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  c.set('user', user);
  c.set('db', db);
  c.set('accessToken', token);
  await next();
});

// 관리자 검사 — requireAuth 뒤에서만 사용 (체인: requireAuth → requireAdmin, backend.md §3).
// role 조회는 유저 토큰(RLS)으로 — 본인 행은 항상 조회 가능. DB 레벨에서는 is_admin() 정책이 이중 방어.
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const { data } = await c
    .get('db')
    .from('profiles')
    .select('role')
    .eq('user_id', c.get('user').id)
    .single();
  if (data?.role !== 'admin') {
    return c.json({ error: '접근 권한이 없습니다.' }, 403);
  }
  await next();
});
