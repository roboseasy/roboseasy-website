import { Hono } from 'hono';
import { Resend } from 'resend';
import { esc } from '../../lib/contactEmail';
import { getEnv } from '../lib/env';
import { getServiceClient } from '../lib/supabase';
import { requireAuth, type AuthEnv } from '../middleware/auth';
import { rateLimit, consumeEmailBudget } from '../middleware/rateLimit';
import { UUID_RE } from '../lib/validation';

// B2C 개인 문의 (CON-06·07) — 로그인 전용. DB(contacts)가 기록 원본, 메일은 운영 알림.
// 이름·연락처는 입력받지 않고 세션의 profiles에서 채운다 (backend.md §3).
export const inquiries = new Hono<AuthEnv>();

// '/'에 마운트되므로 '*'로 걸면 /api/v1/* 전역 미들웨어가 되어 뒤에 등록된 admin 라우트까지 누수됨.
// 이 서브앱의 실제 경로(/inquiries)로만 범위 제한 (backend.md §1 — 라우트 단위 인증).
inquiries.use('/inquiries', requireAuth);

const B2C_TYPES = ['product', 'delivery', 'as', 'refund'] as const;
type B2cType = (typeof B2C_TYPES)[number];
const B2C_TYPE_LABEL: Record<B2cType, string> = {
  product: '제품 문의',
  delivery: '배송 문의',
  as: 'AS 문의',
  refund: '환불·취소 문의',
};

/* ── 개인 문의 등록 ── */
// 회원 전용이므로 user_id로 rate limit(버스트 5, 이후 5분당 1회). requireAuth 뒤라 user 세팅됨.
inquiries.post(
  '/inquiries',
  rateLimit({ name: 'inquiry', capacity: 5, refillPerSec: 1 / 300,
    keyFn: (c) => (c.get('user') as { id?: string } | undefined)?.id ?? null }),
  async (c) => {
  let body: { contactType?: string; message?: string; productSku?: string; orderId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  if (!B2C_TYPES.includes(body.contactType as B2cType)) {
    return c.json({ error: `문의 유형은 ${B2C_TYPES.join('/')} 중 하나여야 합니다.` }, 400);
  }
  if (!body.message?.trim()) {
    return c.json({ error: '문의 내용을 입력해 주세요.' }, 400);
  }

  // 주문 연계(2차 — 배송·환불 문의용, 선택): 본인 주문만 연결 가능
  const orderId = body.orderId?.trim() || null;
  if (orderId) {
    if (!UUID_RE.test(orderId)) return c.json({ error: '존재하지 않는 주문입니다.' }, 400);
    const { data: order } = await c.get('db')
      .from('orders')
      .select('order_id, user_id')
      .eq('order_id', orderId)
      .maybeSingle();
    if (!order || order.user_id !== c.get('user').id) {
      return c.json({ error: '존재하지 않는 주문입니다.' }, 400);
    }
  }

  // 이름·연락처는 profiles에서 (유저 토큰 — RLS 본인 행)
  const uid = c.get('user').id;
  const { data: profile, error: profileError } = await c.get('db')
    .from('profiles')
    .select('user_name, user_email, user_phone')
    .eq('user_id', uid)
    .single();
  if (profileError || !profile) {
    console.error('inquiries: profiles 조회 오류:', profileError);
    return c.json({ error: '회원 정보를 확인할 수 없습니다.' }, 500);
  }

  // insert는 service role — contacts는 직접 insert 정책이 없음 (서버 경유만 허용)
  const db = getServiceClient();
  if (!db) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  const { data: row, error } = await db
    .from('contacts')
    .insert({
      channel: 'b2c',
      contact_type: body.contactType,
      user_id: uid,
      order_id: orderId,
      product_sku: body.productSku?.trim() || null,
      name: profile.user_name,
      email: profile.user_email,
      phone: profile.user_phone,
      message: body.message.trim(),
    })
    .select()
    .single();

  if (error) {
    // 23503: FK 위반 — 존재하지 않는 product_sku
    if (error.code === '23503') {
      return c.json({ error: '존재하지 않는 제품입니다.' }, 400);
    }
    console.error('inquiries insert 오류:', error);
    return c.json({ error: '문의 등록에 실패했습니다.' }, 500);
  }

  // 운영 알림 메일 — DB가 원본이므로 실패해도 접수는 성공 (로깅만).
  // 전역 일일 예산(Resend 무료 100/day) 소진 시 알림만 스킵 — 접수(DB)는 이미 완료됨.
  try {
    if (await consumeEmailBudget(db)) {
      const typeLabel = B2C_TYPE_LABEL[body.contactType as B2cType];
      const resend = new Resend(getEnv('RESEND_API_KEY'));
      const { error: mailError } = await resend.emails.send({
        from: getEnv('QUOTE_FROM'),
        to: getEnv('QUOTE_TO'),
        replyTo: profile.user_email, // 메일함에서 "답장"이 문의 회원에게 바로 가도록
        subject: `[개인문의] ${typeLabel} — ${profile.user_name}`,
        html: `<!DOCTYPE html><html lang="ko"><body style="font-family:system-ui,sans-serif;font-size:14px;color:#333;">
          <h2 style="font-size:16px;">[개인문의] ${typeLabel}</h2>
          <table style="border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;font-weight:600;">회원</td><td>${esc(profile.user_name)} (${esc(profile.user_email)}, ${esc(profile.user_phone)})</td></tr>
            ${body.productSku ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">제품</td><td>${esc(body.productSku)}</td></tr>` : ''}
            <tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top;">내용</td><td style="white-space:pre-wrap;">${esc(body.message)}</td></tr>
          </table>
          <p style="color:#888;font-size:12px;">처리·상태 변경은 관리자 문의 관리에서. (문의 ID: ${row.contact_id})</p>
        </body></html>`,
      });
      if (mailError) console.error('inquiries 알림 메일 오류(무시):', mailError);
    }
  } catch (err) {
    console.error('inquiries 알림 메일 오류(무시):', err);
  }

  return c.json({ success: true, inquiryId: row.contact_id }, 201);
});

/* ── 내 문의 내역 (마이페이지) — RLS contacts_select_own_b2c로 본인 것만 ── */
inquiries.get('/inquiries', async (c) => {
  const { data, error } = await c.get('db')
    .from('contacts')
    .select('contact_id, contact_type, product_sku, order_id, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('inquiries 조회 오류:', error);
    return c.json({ error: '문의 내역을 불러오지 못했습니다.' }, 500);
  }
  return c.json({
    inquiries: (data ?? []).map((r) => ({
      inquiryId: r.contact_id,
      contactType: r.contact_type,
      productSku: r.product_sku,
      orderId: r.order_id,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
});
