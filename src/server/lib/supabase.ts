import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { getEnv } from './env';

// realtime transport로 ws 주입 — Node 20(Netlify Functions 포함)에는 내장 WebSocket이 없어
// supabase-js가 클라이언트 생성 시점에 예외를 던짐. realtime은 사용하지 않지만 생성자가 요구함.
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws as unknown as undefined },
};

// anon 클라이언트 — 인증 작업(signUp/signIn/refresh) 전용.
// 요청 간 세션 공유를 피하기 위해 호출마다 새로 생성 (웜 람다에서 인메모리 세션 잔류 방지)
export function createAnonClient(): SupabaseClient | null {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY');
  if (!url || !key) {
    console.error('[supabase] SUPABASE_URL / SUPABASE_ANON_KEY 미설정');
    return null;
  }
  return createClient(url, key, clientOptions);
}

// 유저 토큰 클라이언트 — RLS가 적용되는 DB 조회용 (요청의 세션 토큰을 Authorization으로 전달)
export function createUserClient(accessToken: string): SupabaseClient | null {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// service role 클라이언트 — RLS를 우회하는 서버 전용 작업에만 사용
// (contacts 기록, 결제 승인·상태 전이, 회원탈퇴 — backend.md §2)
// 환경변수 미설정(로컬 초기 셋업 등) 시 null을 반환해 호출부가 기능을 건너뛸 수 있게 한다.
let serviceClient: SupabaseClient | null | undefined;

export function getServiceClient(): SupabaseClient | null {
  if (serviceClient !== undefined) return serviceClient;
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  serviceClient = url && key ? createClient(url, key, clientOptions) : null;
  if (!serviceClient) console.error('[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정 — DB 기록 기능 비활성');
  return serviceClient;
}
