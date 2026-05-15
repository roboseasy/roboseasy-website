export const prerender = false;

import path from 'path';
import type { APIRoute } from 'astro';
import ExcelJS from 'exceljs';
import { Resend } from 'resend';

const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'excel', '견적서_양식_자동화.xlsx');

const getEnv = (key: string): string =>
  (import.meta.env[key] as string | undefined) ?? process.env[key] ?? '';

const resend = new Resend(getEnv('RESEND_API_KEY'));

interface QuoteItem {
  name: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vat: number;
}

interface ContactPayload {
  name: string;
  title?: string;
  email: string;
  phone: string;
  org?: string;
  type: 'purchase' | 'corp_edu' | 'workshop' | 'etc';
  message: string;
  shipto?: string;
  items?: QuoteItem[];
  supplySum?: number;
  vatSum?: number;
  total?: number;
}

const TYPE_LABEL: Record<string, string> = {
  purchase: '로봇 구매 문의',
  corp_edu: '기업 교육 문의',
  workshop: '워크샵 문의',
  etc: '기타 문의',
};

async function buildQuoteExcel(data: ContactPayload): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.getWorksheet('견적서')!;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const quoteNo = `Q-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  ws.getCell('B4').value = quoteNo;
  ws.getCell('B5').value = data.org ?? '';
  ws.getCell('B6').value = data.name + (data.title ? ` (${data.title})` : '');
  ws.getCell('B7').value = data.phone;
  ws.getCell('B8').value = data.email;
  ws.getCell('B9').value = data.shipto ?? '';

  const items = data.items ?? [];
  for (let i = 0; i < 7; i++) {
    const row = 14 + i;
    const item = items[i];
    ws.getCell(`B${row}`).value = item?.name ?? '';
    ws.getCell(`C${row}`).value = item?.qty ?? null;
    ws.getCell(`D${row}`).value = item?.unitPrice ?? null;
    ws.getCell(`E${row}`).value = item?.supply ?? null;
    ws.getCell(`F${row}`).value = item?.vat ?? null;
  }

  const supplySum  = data.supplySum ?? 0;
  const vatSum     = data.vatSum    ?? 0;
  const finalTotal = data.total     ?? supplySum + vatSum;
  ws.getCell('F22').value = supplySum;
  ws.getCell('F23').value = vatSum;
  ws.getCell('F24').value = supplySum + vatSum;
  ws.getCell('F25').value = 0;
  ws.getCell('F26').value = finalTotal;

  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}

function buildEmailHtml(data: ContactPayload): string {
  const typeLabel = TYPE_LABEL[data.type] ?? data.type;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const quoteNo = `Q-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const td = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 14px;width:110px;font-weight:600;color:#1a0a3d;background:#f5f4fa;border-bottom:1px solid #e8e5f5;white-space:nowrap;">${label}</td>
      <td style="padding:10px 14px;color:#333;border-bottom:1px solid #e8e5f5;">${value}</td>
    </tr>`;

  const customerRows = [
    td('성함', data.name + (data.title ? ` (${data.title})` : '')),
    td('이메일', `<a href="mailto:${data.email}" style="color:#4472c4;">${data.email}</a>`),
    td('연락처', data.phone),
    data.org ? td('소속', data.org) : '',
    data.type === 'purchase' && data.shipto ? td('배송 주소', data.shipto) : '',
  ].filter(Boolean).join('');

  let purchaseSection = '';
  if (data.type === 'purchase' && data.items && data.items.length > 0) {
    const itemRows = data.items.map((it, i) => `
      <tr style="background:${i % 2 === 1 ? '#f9f9fb' : '#fff'};">
        <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e8e5f5;">${i+1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e5f5;">${it.name}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${it.qty.toLocaleString('ko-KR')}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${it.unitPrice.toLocaleString('ko-KR')}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${it.supply.toLocaleString('ko-KR')}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${it.vat.toLocaleString('ko-KR')}</td>
      </tr>`).join('');
    const s = data.supplySum ?? 0, v = data.vatSum ?? 0, f = data.total ?? s + v;
    purchaseSection = `
    <h2 style="font-size:15px;font-weight:700;color:#1a0a3d;margin:28px 0 10px 0;">견적 항목</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e8e5f5;">
      <thead><tr style="background:#1a0a3d;color:#fff;">
        <th style="padding:9px 12px;text-align:center;font-weight:600;width:42px;">No.</th>
        <th style="padding:9px 12px;text-align:left;font-weight:600;">품목</th>
        <th style="padding:9px 12px;text-align:right;font-weight:600;width:60px;">수량</th>
        <th style="padding:9px 12px;text-align:right;font-weight:600;width:80px;">단가</th>
        <th style="padding:9px 12px;text-align:right;font-weight:600;width:90px;">공급가액</th>
        <th style="padding:9px 12px;text-align:right;font-weight:600;width:80px;">부가세</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e8e5f5;border-top:none;">
      <tr><td style="padding:8px 12px;color:#555;border-bottom:1px solid #e8e5f5;">공급가액계</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${s.toLocaleString('ko-KR')} 원</td></tr>
      <tr><td style="padding:8px 12px;color:#555;border-bottom:1px solid #e8e5f5;">부가세계</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${v.toLocaleString('ko-KR')} 원</td></tr>
      <tr style="background:#fffff2;"><td style="padding:10px 12px;font-weight:700;font-size:14px;color:#1a0a3d;">최종 견적 (부가세 포함)</td><td style="padding:10px 12px;font-weight:700;font-size:14px;color:#c00000;text-align:right;">${f.toLocaleString('ko-KR')} 원</td></tr>
    </table>
    <p style="font-size:12px;color:#888;margin:8px 0 0 0;">※ 첨부된 견적서 xlsx 파일에 동일 내용이 포함되어 있습니다.</p>`;
  }

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif;">
  <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="padding:28px 32px 20px;">
      <h1 style="font-size:22px;font-weight:700;color:#1a0a3d;margin:0 0 6px 0;">[로보시지 문의] ${typeLabel}</h1>
      <p style="font-size:12px;color:#888;margin:0;">견적번호 ${quoteNo}</p>
    </div>
    <hr style="border:none;border-top:1px solid #e8e5f5;margin:0;" />
    <div style="padding:20px 32px 0;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e8e5f5;">${customerRows}</table>
    </div>
    <div style="padding:0 32px 24px;">${purchaseSection}</div>
    <hr style="border:none;border-top:1px solid #e8e5f5;margin:0;" />
    <div style="padding:20px 32px 28px;">
      <h2 style="font-size:15px;font-weight:700;color:#1a0a3d;margin:0 0 10px 0;">문의 내용</h2>
      <div style="font-size:14px;color:#333;line-height:1.8;white-space:pre-wrap;background:#f9f9fb;border-radius:6px;padding:14px 16px;">${data.message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    </div>
  </div>
</body></html>`;
}

export const POST: APIRoute = async ({ request }) => {
  let body: ContactPayload;
  let userFiles: File[] = [];
  try {
    const fd = await request.formData();
    const raw = fd.get('data');
    if (typeof raw !== 'string') throw new Error();
    body = JSON.parse(raw);
    userFiles = (fd.getAll('files') as File[]).filter(f => f.size > 0);
  } catch {
    return new Response(JSON.stringify({ success: false, error: '잘못된 요청입니다.' }), { status: 400 });
  }

  if (!body.name || !body.email || !body.phone || !body.type || !body.message) {
    return new Response(JSON.stringify({ success: false, error: '필수 항목이 누락되었습니다.' }), { status: 400 });
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
    userFiles.map(async f => {
      const buf = await f.arrayBuffer();
      return { filename: f.name, content: Buffer.from(buf).toString('base64') };
    })
  );

  const { error } = await resend.emails.send({
    from: getEnv('QUOTE_FROM'),
    to: getEnv('QUOTE_TO'),
    subject: `[로보시지 문의] ${typeLabel} — ${body.name}`,
    html: buildEmailHtml(body),
    attachments: [...attachments, ...userAttachments],
  });

  if (error) {
    console.error('Resend 오류:', error);
    return new Response(JSON.stringify({ success: false, error: '이메일 전송에 실패했습니다.' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
