import { Hono } from 'hono';
import { Resend } from 'resend';
import { buildQuoteExcel } from '../../lib/buildQuoteExcel';
import { buildEmailHtml, TYPE_LABEL, type ContactPayload } from '../../lib/contactEmail';
import { priceQuoteItems, type PricedQuote } from '../../data/quoteItems';
import { getEnv } from '../lib/env';
import { getServiceClient } from '../lib/supabase';
import { rateLimit, clientIp, consumeEmailBudget } from '../middleware/rateLimit';

export const contact = new Hono();

const json = (body: unknown, status: 200 | 400 | 500) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// B2B 문의 접수 — 비회원이라 IP로 rate limit(버스트 5, 이후 5분당 1회).
// 접수 기록은 contacts에 먼저 저장(유실 방지), 그다음 예산 내에서 메일 발송.
contact.post('/contact', rateLimit({ name: 'contact', capacity: 5, refillPerSec: 1 / 300, keyFn: clientIp }), async (c) => {
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

  // 견적 항목 검증·재계산 — 금액은 클라이언트 값을 쓰지 않고 단가표(quoteItems)로 서버가 계산
  let quote: PricedQuote | null = null;
  if (body.type === 'purchase' && body.items !== undefined) {
    quote = priceQuoteItems(body.items);
    if (!quote) return json({ success: false, error: '견적 항목이 올바르지 않습니다.' }, 400);
  }

  const typeLabel = TYPE_LABEL[body.type] ?? body.type;

  // 접수 기록을 먼저 DB에 저장 — 메일이 예산 소진/실패로 못 가도 접수는 남는다(유실 방지, backend.md §3).
  // (첨부·견적서 엑셀은 메일에만 실림 — 예산 소진 시 본문·연락처는 남고 첨부만 유실)
  const db = getServiceClient();
  let recorded = false;
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
    else recorded = true;
  }

  // 전역 일일 예산(Resend 무료 100/day) 확인 후 발송. db 없으면 검사 불가 → 발송 허용(fail-open).
  let mailSent = false;
  const budgetOk = db ? await consumeEmailBudget(db) : true;
  if (budgetOk) {
    const attachments: { filename: string; content: string }[] = [];
    if (quote && quote.items.length > 0) {
      try {
        const buffer = await buildQuoteExcel(body, quote);
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
      replyTo: body.email, // 메일함에서 "답장"이 문의자에게 바로 가도록 (From은 검증 도메인만 가능)
      subject: `[로보시지 문의] ${typeLabel} — ${body.name}`,
      html: buildEmailHtml(body, quote),
      attachments: [...attachments, ...userAttachments],
    });
    if (error) console.error('Resend 오류:', error);
    else mailSent = true;
  }

  // 메일 발송 성공이면 통상 성공. 예산 소진·발송 실패라도 DB에 접수됐으면 성공 안내(확인 후 연락).
  if (mailSent) return json({ success: true }, 200);
  if (recorded) return json({ success: true, message: '문의가 접수되었습니다. 확인 후 연락드리겠습니다.' }, 200);
  return json({ success: false, error: '접수에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
});
