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
  // JSON 파싱 결과라 필드가 문자열이 아닐 수 있음(숫자·배열 등) — 문자열이 아니면 아래 길이
  // 검사가 통과해 버리므로 DB insert·메일 발송 전에 타입부터 확정 (quoteDownload.ts와 동일 기준)
  if (
    [body.name, body.email, body.phone, body.type, body.message].some((v) => typeof v !== 'string') ||
    [body.title, body.org, body.shipto, body.isBuyer, body.purchaseMonth].some(
      (v) => v != null && typeof v !== 'string'
    )
  ) {
    return json({ success: false, error: '잘못된 요청입니다.' }, 400);
  }
  // 미지의 type이면 메일은 가도 contacts insert가 CHECK 위반으로 유실됨 — 사전 차단
  if (!TYPE_LABEL[body.type]) {
    return json({ success: false, error: '잘못된 문의 유형입니다.' }, 400);
  }
  // 컬럼(varchar) 한도 초과 시 insert가 22001로 실패해 기록이 유실됨 — 사전 차단(스키마와 동일 한도)
  if (body.name.length > 100 || body.email.length > 255 || body.phone.length > 20 || (body.org?.length ?? 0) > 100) {
    return json({ success: false, error: '입력 값이 허용 길이를 초과했습니다.' }, 400);
  }
  // message는 text 컬럼이라 DB 한도가 없음 — 폭주 방지용 상식적 상한(서버 검증)
  if (body.message.length > 5000) {
    return json({ success: false, error: '문의 내용은 5,000자 이내로 입력해 주세요.' }, 400);
  }
  // 첨부 상한 — base64 인코딩 메모리 팽창·Resend 발송 한도 보호 (프론트 제한과 별개로 서버가 검증)
  if (
    userFiles.length > 5 ||
    userFiles.some((f) => f.name.length > 255) ||
    userFiles.reduce((sum, f) => sum + f.size, 0) > 5 * 1024 * 1024
  ) {
    return json({ success: false, error: '첨부파일은 최대 5개, 총 5MB 이내여야 합니다.' }, 400);
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

  // 메일 발송 성공이면 통상 성공.
  if (mailSent) return json({ success: true }, 200);
  // 첨부·견적서 엑셀·배송지(shipto)는 DB가 아닌 메일에만 실림 — 메일 실패 시 영구 유실되므로
  // 이런 데이터가 실제로 있는 문의는 DB에 접수됐어도 실패로 안내해 재시도를 유도한다.
  // (purchase 유형이라도 견적 항목·배송지·첨부가 전혀 없으면 본문·연락처가 전부라 DB 기록으로 충분)
  const hasEmailOnlyData =
    userFiles.length > 0 ||
    (quote !== null && quote.items.length > 0) ||
    (body.type === 'purchase' && !!body.shipto);
  // 그 외(본문·연락처가 전부인 문의)는 DB 기록만으로 충분하므로 접수 성공 안내.
  if (recorded && !hasEmailOnlyData) return json({ success: true, message: '문의가 접수되었습니다. 확인 후 연락드리겠습니다.' }, 200);
  return json({ success: false, error: '접수에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
});
