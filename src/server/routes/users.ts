import { Hono } from 'hono';
import { createAnonClient, createUserClient, getServiceClient } from '../lib/supabase';
import { getEnv } from '../lib/env';
import {
  requireAuth,
  setSessionCookies,
  clearSessionCookies,
  getSessionTokens,
  type AuthEnv,
} from '../middleware/auth';

export const users = new Hono<AuthEnv>();

// Supabase 인증 에러 → 한국어 메시지 매핑
const AUTH_ERROR_MESSAGE: Record<string, string> = {
  invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
  email_not_confirmed: '이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해 주세요.',
  user_already_exists: '이미 가입된 이메일입니다.',
  email_exists: '이미 가입된 이메일입니다.',
  weak_password: '비밀번호가 너무 짧거나 단순합니다.',
  over_email_send_rate_limit: '잠시 후 다시 시도해 주세요. (메일 발송 한도)',
  user_banned: '탈퇴 처리된 계정입니다.',
};
const authMessage = (code: string | undefined, fallback: string) =>
  (code && AUTH_ERROR_MESSAGE[code]) || fallback;

const anonEmail = (userId: string) => `deleted-${userId}@removed.invalid`;

// 우편번호 — 카카오 우편번호 서비스 zonecode (5자리 숫자)
const POSTCODE_RE = /^\d{5}$/;

// profiles varchar 한도 — DB 초과 에러(22001)를 400으로 선제 차단
const FIELD_LIMITS = { name: 100, phone: 20, address: 255, addressDetail: 255 } as const;
const withinLimits = (v: { name?: string; phone?: string; address?: string; addressDetail?: string }) =>
  (!v.name || v.name.length <= FIELD_LIMITS.name) &&
  (!v.phone || v.phone.length <= FIELD_LIMITS.phone) &&
  (!v.address || v.address.length <= FIELD_LIMITS.address) &&
  (!v.addressDetail || v.addressDetail.length <= FIELD_LIMITS.addressDetail);

/* ── 회원가입 (USR-01) ─────────────────────────────────────
   profiles 행은 auth.users insert 트리거가 user_metadata로 생성.
   약관·개인정보 동의 일시는 profiles default now()로 기록됨. */
users.post('/users/signup', async (c) => {
  let body: {
    email?: string; password?: string; name?: string; phone?: string;
    postcode?: string; address?: string; addressDetail?: string;
    marketingConsent?: boolean; termsAgreed?: boolean; privacyAgreed?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  const { email, password, name, phone, postcode, address } = body;
  if (!email || !password || !name || !phone || !postcode || !address) {
    return c.json({ error: '필수 항목이 누락되었습니다.' }, 400);
  }
  if (!POSTCODE_RE.test(postcode)) {
    return c.json({ error: '우편번호가 올바르지 않습니다. 주소 검색으로 입력해 주세요.' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, 400);
  }
  if (!withinLimits({ name, phone, address, addressDetail: body.addressDetail })) {
    return c.json({ error: '입력 값이 허용 길이를 초과했습니다.' }, 400);
  }
  if (body.termsAgreed !== true || body.privacyAgreed !== true) {
    return c.json({ error: '이용약관과 개인정보처리방침에 동의해 주세요.' }, 400);
  }

  const anon = createAnonClient();
  if (!anon) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  // 이메일 확인 후 이동할 페이지 — 로컬/프로덕션 origin을 따라감
  const origin = c.req.header('origin') ?? getEnv('PUBLIC_SITE_URL') ?? 'https://roboseasy.ai';

  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/login`,
      data: {
        user_name: name,
        user_phone: phone,
        user_postcode: postcode,
        user_address: address,
        user_address_detail: body.addressDetail?.trim() ?? '',
        marketing_consent: body.marketingConsent === true,
      },
    },
  });

  if (error) {
    console.error('signup 오류:', error);
    return c.json({ error: authMessage(error.code, '가입 처리 중 오류가 발생했습니다.') }, 400);
  }
  // Confirm email 활성 상태에서 기존 이메일로 가입 시도 시 identities가 빈 배열로 옴.
  // 이 경우도 신규 가입과 동일 응답 — 이메일 존재 여부 열거(enumeration) 방지.
  // (실제 미가입이면 확인 메일 발송, 기존 가입이면 Supabase가 재확인 메일 처리)

  return c.json({ success: true, message: '확인 메일을 발송했습니다. 받은 편지함을 확인해 주세요.' });
});

/* ── 로그인 (USR-02) — 성공 시 httpOnly 세션 쿠키 발급 + role 반환 ── */
users.post('/users/login', async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }
  if (!body.email || !body.password) {
    return c.json({ error: '이메일과 비밀번호를 입력해 주세요.' }, 400);
  }

  const anon = createAnonClient();
  if (!anon) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  const { data, error } = await anon.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (error || !data.session) {
    return c.json({ error: authMessage(error?.code, '로그인에 실패했습니다.') }, 401);
  }

  setSessionCookies(c, data.session);

  // role 조회 (로그인 시퀀스 — backend.md §4). 실패해도 로그인 자체는 유효하므로 기본값 user
  const db = createUserClient(data.session.access_token);
  let role = 'user';
  if (db) {
    const { data: profile } = await db
      .from('profiles').select('role').eq('user_id', data.user.id).single();
    if (profile?.role) role = profile.role;
  }

  return c.json({ success: true, role });
});

/* ── 로그아웃 (USR-05) — 리프레시 토큰 폐기(best-effort) + 쿠키 삭제 ── */
users.post('/users/logout', async (c) => {
  const { accessToken } = getSessionTokens(c);
  if (accessToken) {
    try {
      await fetch(`${getEnv('SUPABASE_URL')}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: getEnv('SUPABASE_ANON_KEY'),
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      console.error('logout 오류(무시):', err);
    }
  }
  clearSessionCookies(c);
  return c.json({ success: true });
});

// 일반 로그인(password) 액세스 토큰 판별 — 재설정 엔드포인트에서 이런 토큰의 무단 비밀번호 변경 차단.
// JWT amr(인증 수단) 클레임 확인: 서명 검증은 GoTrue가 하므로 여기선 페이로드 클레임만 본다.
// 안전 우선 설계 — 'password'만 있고 복구/OTP 흔적이 없는 토큰만 거부(복구 토큰의 amr 형태가
// 예상과 달라도 정상 재설정 흐름을 막지 않도록). 디코드 실패 시에도 막지 않음(기존 동작 유지).
function isPlainLoginToken(accessToken: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'),
    ) as { amr?: Array<{ method?: string }> };
    const methods = (payload.amr ?? []).map((m) => m.method);
    const hasRecovery = methods.some((m) => m === 'recovery' || m === 'otp' || m === 'magiclink');
    return methods.includes('password') && !hasRecovery;
  } catch {
    return false;
  }
}

/* GoTrue 유저 비밀번호 갱신 — supabase-js updateUser는 세션 보유 클라이언트가 필요해 REST 직접 호출.
   토큰은 로그인 세션의 액세스 토큰 또는 재설정 메일의 복구 토큰 */
async function updateUserPassword(
  accessToken: string,
  password: string,
): Promise<{ ok: boolean; errorCode?: string }> {
  try {
    const res = await fetch(`${getEnv('SUPABASE_URL')}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: getEnv('SUPABASE_ANON_KEY'),
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    if (res.ok) return { ok: true };
    const errBody = await res.json().catch(() => null);
    console.error('비밀번호 갱신 오류:', res.status, errBody);
    return { ok: false, errorCode: errBody?.error_code };
  } catch (err) {
    console.error('비밀번호 갱신 오류:', err);
    return { ok: false };
  }
}

/* ── 비밀번호 변경 (로그인 상태, 마이페이지) — 현재 비밀번호 재확인 후 변경 ── */
users.patch('/users/password', requireAuth, async (c) => {
  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }
  if (!body.currentPassword || !body.newPassword) {
    return c.json({ error: '필수 항목이 누락되었습니다.' }, 400);
  }
  if (body.newPassword.length < 8) {
    return c.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, 400);
  }

  const email = c.get('user').email;
  if (!email) return c.json({ error: '회원 정보를 확인할 수 없습니다.' }, 500);

  const anon = createAnonClient();
  if (!anon) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  // 본인 재확인 — 세션 탈취·자리 비움 상태에서의 무단 변경 방지
  const { error: verifyError } = await anon.auth.signInWithPassword({
    email,
    password: body.currentPassword,
  });
  if (verifyError) return c.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, 400);

  const result = await updateUserPassword(c.get('accessToken'), body.newPassword);
  if (result.errorCode === 'same_password') {
    return c.json({ error: '새 비밀번호가 기존 비밀번호와 같습니다.' }, 400);
  }
  if (result.errorCode === 'weak_password') {
    return c.json({ error: '비밀번호가 보안 정책에 맞지 않습니다. 다른 비밀번호를 사용해 주세요.' }, 400);
  }
  if (!result.ok) return c.json({ error: '비밀번호 변경에 실패했습니다.' }, 500);
  return c.json({ success: true });
});

/* ── 비밀번호 재설정 요청 (비로그인) — 재설정 메일 발송.
   미가입 이메일도 동일 응답: 계정 존재 여부 탐색 차단 ── */
users.post('/users/reset-password-request', async (c) => {
  let body: { email?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }
  if (!body.email) return c.json({ error: '이메일을 입력해 주세요.' }, 400);

  const anon = createAnonClient();
  if (!anon) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  const origin = c.req.header('origin') ?? getEnv('PUBLIC_SITE_URL') ?? 'https://roboseasy.ai';
  const { error } = await anon.auth.resetPasswordForEmail(body.email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) {
    // rate limit만 사용자에게 노출, 그 외(미가입 등)는 성공으로 위장
    if (error.code === 'over_email_send_rate_limit') {
      return c.json({ error: '잠시 후 다시 시도해 주세요. (메일 발송 한도)' }, 429);
    }
    console.error('reset-password-request 오류(성공 응답 처리):', error);
  }
  return c.json({ success: true, message: '가입된 이메일이라면 재설정 링크를 발송했습니다.' });
});

/* ── 비밀번호 재설정 확정 — 메일 링크의 복구 토큰(1회용·1시간)으로 변경 ── */
users.post('/users/reset-password', async (c) => {
  let body: { accessToken?: string; newPassword?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }
  if (!body.accessToken || !body.newPassword) {
    return c.json({ error: '필수 항목이 누락되었습니다.' }, 400);
  }
  if (body.newPassword.length < 8) {
    return c.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, 400);
  }
  // 일반 로그인 토큰으로의 비밀번호 변경 차단 — 이 경로는 복구 링크 토큰 전용
  // (로그인 상태 변경은 현재 비밀번호를 요구하는 PATCH /users/password 사용)
  if (isPlainLoginToken(body.accessToken)) {
    return c.json({ error: '유효한 재설정 링크가 아닙니다. 재설정 메일을 다시 요청해 주세요.' }, 400);
  }

  const result = await updateUserPassword(body.accessToken, body.newPassword);
  if (result.errorCode === 'same_password') {
    return c.json({ error: '새 비밀번호가 기존 비밀번호와 같습니다.' }, 400);
  }
  if (result.errorCode === 'weak_password') {
    return c.json({ error: '비밀번호가 보안 정책에 맞지 않습니다. 다른 비밀번호를 사용해 주세요.' }, 400);
  }
  if (!result.ok) {
    return c.json(
      { error: '링크가 만료되었거나 유효하지 않습니다. 재설정 메일을 다시 요청해 주세요.' },
      400,
    );
  }
  return c.json({ success: true });
});

/* ── 내 정보 조회 — 마이페이지 초기값 (RLS: 본인 행만) ── */
users.get('/users/me', requireAuth, async (c) => {
  const db = c.get('db');
  const { data, error } = await db
    .from('profiles')
    .select('user_email, user_name, user_phone, user_postcode, user_address, user_address_detail, role, marketing_consent, created_at')
    .eq('user_id', c.get('user').id)
    .single();
  if (error || !data) {
    console.error('profiles 조회 오류:', error);
    return c.json({ error: '회원 정보를 불러오지 못했습니다.' }, 500);
  }
  return c.json({
    email: data.user_email,
    name: data.user_name,
    phone: data.user_phone,
    postcode: data.user_postcode,
    address: data.user_address,
    addressDetail: data.user_address_detail,
    role: data.role,
    marketingConsent: data.marketing_consent,
    createdAt: data.created_at,
  });
});

/* ── 회원정보 수정 (USR-03) — 이메일 제외, 마케팅 동의 변경 시 동의 일시 갱신 ── */
users.patch('/users/me', requireAuth, async (c) => {
  let body: {
    name?: string; phone?: string;
    postcode?: string; address?: string; addressDetail?: string;
    marketingConsent?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  if (!withinLimits({ name: body.name, phone: body.phone, address: body.address, addressDetail: body.addressDetail })) {
    return c.json({ error: '입력 값이 허용 길이를 초과했습니다.' }, 400);
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) update.user_name = body.name.trim();
  if (typeof body.phone === 'string' && body.phone.trim()) update.user_phone = body.phone.trim();
  if (typeof body.postcode === 'string' && body.postcode.trim()) {
    if (!POSTCODE_RE.test(body.postcode.trim())) {
      return c.json({ error: '우편번호가 올바르지 않습니다. 주소 검색으로 입력해 주세요.' }, 400);
    }
    update.user_postcode = body.postcode.trim();
  }
  if (typeof body.address === 'string' && body.address.trim()) update.user_address = body.address.trim();
  // 상세주소는 빈 값 저장 허용 (상세주소가 없는 주소도 있음)
  if (typeof body.addressDetail === 'string') update.user_address_detail = body.addressDetail.trim();

  const db = c.get('db');
  const uid = c.get('user').id;

  if (typeof body.marketingConsent === 'boolean') {
    const { data: current } = await db
      .from('profiles').select('marketing_consent').eq('user_id', uid).single();
    if (current && current.marketing_consent !== body.marketingConsent) {
      update.marketing_consent = body.marketingConsent;
      update.marketing_consent_at = new Date().toISOString(); // 동의·철회 일시 — 2년 재확인 기준점
    }
  }

  // 변경분 없음(값이 기존과 동일 등)은 no-op 성공 — 폼 전체 저장 UI에서 에러로 보이지 않게
  if (Object.keys(update).length === 0) {
    return c.json({ success: true });
  }

  const { error } = await db.from('profiles').update(update).eq('user_id', uid);
  if (error) {
    console.error('profiles 수정 오류:', error);
    return c.json({ error: '회원 정보 수정에 실패했습니다.' }, 500);
  }
  return c.json({ success: true });
});

/* ── 회원탈퇴 (USR-04) — backend.md §6 탈퇴 정책 ──────────
   주문 이력 없음: hard delete (profiles·cart·dibs CASCADE, contacts.user_id SET NULL)
   주문 이력 있음: auth 계정 이메일 스크램블 + 영구 ban + profiles 익명화 (거래기록 5년 보존)
   공통: 본인 문의 기록의 개인정보 처리 — 일반 문의 익명화, 분쟁(is_dispute)은 원본 유지 */
users.delete('/users/me', requireAuth, async (c) => {
  const admin = getServiceClient();
  if (!admin) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  const uid = c.get('user').id;
  const scrambled = anonEmail(uid);

  // 일반 문의 익명화 (user_id가 SET NULL 되기 전에 — 분쟁 기록은 3년 보존 근거로 유지)
  // 실패 시 중단: hard delete 시 user_id가 SET NULL 되면 이 문의의 개인정보를 다시 익명화할 키가
  // 사라져 영구 고아 PII가 됨. 재실행은 멱등하므로 사용자가 재시도하면 복구 가능.
  const { error: contactsError } = await admin
    .from('contacts')
    .update({ name: '(탈퇴회원)', email: scrambled, phone: '' })
    .eq('user_id', uid)
    .eq('is_dispute', false);
  if (contactsError) {
    console.error('탈퇴: contacts 익명화 오류:', contactsError);
    return c.json({ error: '탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }

  // 주문 이력 조회 — 조회 자체가 실패하면 hard/익명화 분기를 신뢰할 수 없으므로 중단
  // (에러 무시 시 주문 있는 회원이 hard-delete 분기로 잘못 진입할 수 있음)
  const { data: order, error: orderError } = await admin
    .from('orders').select('order_id').eq('user_id', uid).limit(1).maybeSingle();
  if (orderError) {
    console.error('탈퇴: 주문 이력 조회 오류:', orderError);
    return c.json({ error: '탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }

  if (!order) {
    // 주문 이력 없음 → hard delete
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) {
      console.error('탈퇴(hard delete) 오류:', error);
      return c.json({ error: '탈퇴 처리에 실패했습니다.' }, 500);
    }
  } else {
    // 주문 이력 있음 → 익명화 + 차단 (2-1 트리거가 익명화 패턴으로의 이메일 변경을 허용)
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        user_name: '(탈퇴회원)',
        user_phone: '',
        user_postcode: '',
        user_address: '',
        user_address_detail: '',
        user_email: scrambled,
        marketing_consent: false,
        marketing_consent_at: null,
      })
      .eq('user_id', uid);
    if (profileError) {
      console.error('탈퇴: profiles 익명화 오류:', profileError);
      return c.json({ error: '탈퇴 처리에 실패했습니다.' }, 500);
    }

    const { error: authError } = await admin.auth.admin.updateUserById(uid, {
      email: scrambled,
      email_confirm: true,
      password: crypto.randomUUID(),
      user_metadata: {},
      ban_duration: '876000h', // 사실상 영구 (약 100년)
    });
    if (authError) {
      console.error('탈퇴: auth 익명화 오류:', authError);
      return c.json({ error: '탈퇴 처리에 실패했습니다.' }, 500);
    }
  }

  clearSessionCookies(c);
  return c.json({ success: true });
});
