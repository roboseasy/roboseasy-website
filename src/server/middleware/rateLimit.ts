import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '../lib/supabase';

// Token Bucket rate limit — 상태는 Supabase(consume_token RPC)에 두어 서버리스 인스턴스 간 공유.

type Policy = {
  name: string;                          // 버킷 접두어 (예: 'contact', 'inquiry')
  capacity: number;                      // 버스트 허용량
  refillPerSec: number;                  // 평균 허용률(초당 토큰)
  keyFn: (c: Context) => string | null;  // 식별자(IP/uid). null이면 검사 스킵
};

export function rateLimit(p: Policy) {
  return createMiddleware(async (c, next) => {
    const id = p.keyFn(c);
    const db = getServiceClient();
    // 식별 불가·DB 미설정 → fail-open(통과). 리미터 장애가 기능을 막지 않도록 가용성 우선.
    if (!id || !db) return next();

    const { data, error } = await db.rpc('consume_token', {
      p_key: `${p.name}:${id}`,
      p_capacity: p.capacity,
      p_refill_per_sec: p.refillPerSec,
    });
    if (error) { console.error('[rateLimit] RPC 오류(통과 처리):', error); return next(); }

    const row = data?.[0];
    if (row && !row.allowed) {
      c.header('Retry-After', String(Math.ceil(row.retry_after)));
      return c.json({ error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, 429);
    }
    await next();
  });
}

// Netlify가 세팅하는 실제 클라이언트 IP. x-forwarded-for는 스푸핑 가능하므로 nf 헤더 우선.
export const clientIp = (c: Context): string | null =>
  c.req.header('x-nf-client-connection-ip')
  ?? c.req.header('x-forwarded-for')?.split(',')[0].trim()
  ?? null;

// 전역 일일 이메일 예산 — Resend 무료 100/day 보호. 모든 Resend 발송 직전에 호출.
// capacity 100, refill 100/day(=100/86400s) → 롤링 100개/일. true면 발송 허용.
export async function consumeEmailBudget(db: SupabaseClient): Promise<boolean> {
  const { data, error } = await db.rpc('consume_token', {
    p_key: 'global:resend',
    p_capacity: 100,
    p_refill_per_sec: 100 / 86400,
  });
  if (error) { console.error('[emailBudget] RPC 오류(발송 허용):', error); return true; } // fail-open
  const row = data?.[0];
  return !(row && !row.allowed);
}
