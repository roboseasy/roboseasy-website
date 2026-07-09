import { Hono } from 'hono';
import { Resend } from 'resend';
import { buildQuoteExcel } from '../../lib/buildQuoteExcel';
import { buildEmailHtml, TYPE_LABEL, type ContactPayload } from '../../lib/contactEmail';
import { getEnv } from '../lib/env';
import { getServiceClient } from '../lib/supabase';

export const contact = new Hono();

const json = (body: unknown, status: 200 | 400 | 500) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// B2B 문의 접수 — 메일이 기록 원본(첨부 포함), contacts insert는 보유기간 관리용 병행 기록
contact.post('/contact', async (c) => {
  let body: ContactPayload;
  let userFiles: File[] = [];
  try {
    const fd = await c.req.raw.formData();
    const raw = fd.get('data');
    if (typeof raw !== 'string') throw new Error();
    body = JSON.parse(raw);
    userFiles = (fd.getAll('files') as File[]).filter((f) => f.size > 0);
  } catch {
    return json({ success: false, error: '잘못된 요청입니다.' }, 400);
  }

  if (!body.name || !body.email || !body.phone || !body.type || !body.message) {
    return json({ success: false, error: '필수 항목이 누락되었습니다.' }, 400);
  }
  // 미지의 type이면 메일은 가도 contacts insert가 CHECK 위반으로 유실됨 — 사전 차단
  if (!TYPE_LABEL[body.type]) {
    return json({ success: false, error: '잘못된 문의 유형입니다.' }, 400);
  }

  const typeLabel = TYPE_LABEL[body.type] ?? body.type;
  const attachments: { filename: string; content: string }[] = [];

  if (body.type === 'purchase' && body.items && body.items.length > 0) {
    try {
      const buffer = await buildQuoteExcel(body);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
      attachments.push({ filename: `견적서_${body.name}_${stamp}.xlsx`, content: Buffer.from(buffer).toString('base64') });
    } catch (err) {
      console.error('Excel 생성 오류:', err);
    }
  }

  const userAttachments = await Promise.all(
    userFiles.map(async (f) => {
      const buf = await f.arrayBuffer();
      return { filename: f.name, content: Buffer.from(buf).toString('base64') };
    })
  );

  const resend = new Resend(getEnv('RESEND_API_KEY'));
  const { error } = await resend.emails.send({
    from: getEnv('QUOTE_FROM'),
    to: getEnv('QUOTE_TO'),
    subject: `[로보시지 문의] ${typeLabel} — ${body.name}`,
    html: buildEmailHtml(body),
    attachments: [...attachments, ...userAttachments],
  });

  if (error) {
    console.error('Resend 오류:', error);
    return json({ success: false, error: '이메일 전송에 실패했습니다.' }, 500);
  }

  // 문의 기록 — 실패해도 접수(메일)는 성공이므로 로깅만 (backend.md §3)
  const db = getServiceClient();
  if (db) {
    const { error: dbError } = await db.from('contacts').insert({
      channel: 'b2b',
      contact_type: body.type,
      name: body.name,
      email: body.email,
      phone: body.phone,
      org: body.org ?? null,
      message: body.message,
    });
    if (dbError) console.error('contacts insert 오류:', dbError);
  }

  return json({ success: true }, 200);
});
