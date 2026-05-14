export const prerender = false;

import type { APIRoute } from 'astro';
import ExcelJS from 'exceljs';
import { Resend } from 'resend';

const getEnv = (key: string): string => process.env[key] ?? '';

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
  wb.creator = 'RoboSEasy';
  const ws = wb.addWorksheet('견적서');

  ws.getColumn('A').width = 10.71;
  ws.getColumn('B').width = 36;
  ws.getColumn('C').width = 8;
  ws.getColumn('D').width = 13;
  ws.getColumn('E').width = 14;
  ws.getColumn('F').width = 12;
  ws.getColumn('G').width = 14;

  const FILL_LABEL_L = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD9E1F2' } };
  const FILL_LABEL_R = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFCFE2F3' } };
  const FILL_YELLOW  = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF2CC' } };
  const FILL_BLUE    = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } };

  const B_ALL: Partial<ExcelJS.Borders> = { top: { style:'thin', color:{argb:'FF000000'} }, bottom: { style:'thin', color:{argb:'FF000000'} }, left: { style:'thin', color:{argb:'FF000000'} }, right: { style:'thin', color:{argb:'FF000000'} } };
  const B_LTB: Partial<ExcelJS.Borders> = { top: { style:'thin', color:{argb:'FF000000'} }, bottom: { style:'thin', color:{argb:'FF000000'} }, left: { style:'thin', color:{argb:'FF000000'} } };
  const B_LRT: Partial<ExcelJS.Borders> = { top: { style:'thin', color:{argb:'FF000000'} }, left: { style:'thin', color:{argb:'FF000000'} }, right: { style:'thin', color:{argb:'FF000000'} } };
  const B_LT:  Partial<ExcelJS.Borders> = { top: { style:'thin', color:{argb:'FF000000'} }, left: { style:'thin', color:{argb:'FF000000'} } };

  function s(cell: ExcelJS.Cell, opts: { font?: Partial<ExcelJS.Font>; fill?: ExcelJS.Fill; border?: Partial<ExcelJS.Borders>; align?: Partial<ExcelJS.Alignment>; numFmt?: string }) {
    if (opts.font)   cell.font      = opts.font;
    if (opts.fill)   cell.fill      = opts.fill;
    if (opts.border) cell.border    = opts.border;
    if (opts.align)  cell.alignment = opts.align;
    if (opts.numFmt) cell.numFmt   = opts.numFmt;
  }

  const CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const LEFT:   Partial<ExcelJS.Alignment> = { horizontal: 'left',   vertical: 'middle', wrapText: true };
  const RIGHT:  Partial<ExcelJS.Alignment> = { horizontal: 'right',  vertical: 'middle', wrapText: true };

  const FONT_TITLE    = { name: 'Noto Sans', size: 24, bold: true };
  const FONT_LABEL_L  = { name: 'Noto Sans', size: 10, bold: true };
  const FONT_LABEL_R  = { name: 'Noto Sans', size: 10, bold: true };
  const FONT_VALUE    = { name: 'Malgun Gothic', size: 10 };
  const FONT_ADDR_LBL = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF000000' } };
  const FONT_TOTAL_LBL = { name: 'Malgun Gothic', size: 14, bold: true };
  const FONT_TOTAL_VAL = { name: 'Malgun Gothic', size: 14, bold: true, color: { argb: 'FFC00000' } };
  const FONT_COL_HDR  = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const FONT_NOTE     = { name: 'Noto Sans', size: 9, color: { argb: 'FF7F7F7F' } };
  const FONT_SUM_LBL  = { name: 'Noto Sans', size: 10, bold: true };
  const FONT_FINAL_LBL = { name: 'Noto Sans', size: 12, bold: true, color: { argb: 'FFC00000' } };
  const FONT_FINAL_VAL = { name: 'Noto Sans', size: 12, bold: true, color: { argb: 'FFC00000' } };
  const NUM_KRW = '#,##0';

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const quoteNo = `Q-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  ws.getRow(1).height = 18.75;
  ws.getRow(2).height = 30;
  ws.getRow(3).height = 30;
  ws.mergeCells('A1:A3');
  s(ws.getCell('A1'), { border: B_LTB, align: CENTER });
  ws.mergeCells('B1:G3');
  ws.getCell('B1').value = '견   적   서';
  s(ws.getCell('B1'), { font: FONT_TITLE, border: B_ALL, align: CENTER });

  const infoData = [
    { r: 4, lbl: '견적번호', val: quoteNo },
    { r: 5, lbl: '업체명',   val: data.org || '' },
    { r: 6, lbl: '담당자',   val: data.name },
    { r: 7, lbl: '연락처',   val: data.phone },
    { r: 8, lbl: '이메일',   val: data.email },
  ];
  const companyData   = ['로보시지 RoboSEasy', '173-44-01316', '김현우', '010-7236-1195', 'roboseasy@gmail.com'];
  const companyLabels = ['회사명', '사업자', '담당자', '연락처', '이메일'];

  infoData.forEach(({ r, lbl, val }, i) => {
    ws.getRow(r).height = 21.75;
    ws.getCell(`A${r}`).value = lbl;
    s(ws.getCell(`A${r}`), { font: FONT_LABEL_L, fill: FILL_LABEL_L, border: B_ALL, align: CENTER });
    ws.mergeCells(`B${r}:C${r}`);
    ws.getCell(`B${r}`).value = val;
    s(ws.getCell(`B${r}`), { font: FONT_VALUE, border: B_LTB, align: LEFT });
    ws.mergeCells(`D${r}:E${r}`);
    ws.getCell(`D${r}`).value = companyLabels[i];
    s(ws.getCell(`D${r}`), { font: FONT_LABEL_R, fill: FILL_LABEL_L, border: B_LTB, align: CENTER });
    ws.mergeCells(`F${r}:G${r}`);
    ws.getCell(`F${r}`).value = companyData[i];
    s(ws.getCell(`F${r}`), { font: FONT_VALUE, border: B_LTB, align: LEFT });
  });

  ws.getRow(9).height = 24;
  ws.getCell('A9').value = '배송 주소';
  s(ws.getCell('A9'), { font: FONT_ADDR_LBL, fill: FILL_LABEL_R, border: B_LRT, align: CENTER });
  ws.mergeCells('B9:G9');
  ws.getCell('B9').value = data.shipto ?? '';
  s(ws.getCell('B9'), { font: FONT_VALUE, border: B_LT, align: LEFT });

  ws.getRow(10).height = 24;
  ws.mergeCells('A10:G10');
  s(ws.getCell('A10'), { border: B_LT, align: LEFT });

  ws.getRow(11).height = 31.5;
  ws.mergeCells('A11:B11');
  ws.getCell('A11').value = 'Total';
  s(ws.getCell('A11'), { font: FONT_TOTAL_LBL, fill: FILL_YELLOW, border: B_LTB, align: CENTER });
  ws.mergeCells('C11:G11');
  ws.getCell('C11').value = `₩ ${(data.total ?? 0).toLocaleString('ko-KR')} (부가세 포함)`;
  s(ws.getCell('C11'), { font: FONT_TOTAL_VAL, fill: FILL_YELLOW, border: B_LTB, align: CENTER });

  ws.getRow(12).height = 6;

  ws.getRow(13).height = 25.5;
  ['No.','품목','수량','단가','공급가액','부가세','비고'].forEach((h, i) => {
    const cell = ws.getCell(`${'ABCDEFG'[i]}13`);
    cell.value = h;
    s(cell, { font: FONT_COL_HDR, fill: FILL_BLUE, border: B_ALL, align: CENTER });
  });

  const items = data.items ?? [];
  for (let i = 0; i < 7; i++) {
    const row = 14 + i;
    ws.getRow(row).height = 30;
    const item = items[i];
    ws.getCell(`A${row}`).value = `${i+1}.`;
    s(ws.getCell(`A${row}`), { font: FONT_VALUE, border: B_ALL, align: CENTER });
    ws.getCell(`B${row}`).value = item?.name ?? '';
    s(ws.getCell(`B${row}`), { font: FONT_VALUE, border: B_ALL, align: LEFT });
    ws.getCell(`C${row}`).value = item?.qty ?? null;
    s(ws.getCell(`C${row}`), { font: FONT_VALUE, border: B_ALL, align: CENTER, numFmt: NUM_KRW });
    ws.getCell(`D${row}`).value = item?.unitPrice ?? null;
    s(ws.getCell(`D${row}`), { font: FONT_VALUE, border: B_ALL, align: RIGHT, numFmt: NUM_KRW });
    ws.getCell(`E${row}`).value = item?.supply ?? null;
    s(ws.getCell(`E${row}`), { font: FONT_VALUE, border: B_ALL, align: RIGHT, numFmt: NUM_KRW });
    ws.getCell(`F${row}`).value = item?.vat ?? null;
    s(ws.getCell(`F${row}`), { font: FONT_VALUE, border: B_ALL, align: RIGHT, numFmt: NUM_KRW });
    ws.getCell(`G${row}`).value = '';
    s(ws.getCell(`G${row}`), { font: FONT_VALUE, border: B_ALL, align: CENTER });
  }

  ws.getRow(21).height = 18;
  ws.mergeCells('A21:G21');
  ws.getCell('A21').value = '※ 일의 자리에서 반올림';
  s(ws.getCell('A21'), { font: FONT_NOTE, align: RIGHT });

  ws.mergeCells('A22:C26');
  ws.getCell('A22').value = '';

  const supplySum  = data.supplySum ?? 0;
  const vatSum     = data.vatSum    ?? 0;
  const finalTotal = data.total     ?? supplySum + vatSum;

  const totals: [number, string, number, ExcelJS.Font, ExcelJS.Fill | undefined][] = [
    [22, '공급가액계', supplySum,           FONT_SUM_LBL   as ExcelJS.Font, undefined],
    [23, '부가세계',   vatSum,              FONT_SUM_LBL   as ExcelJS.Font, undefined],
    [24, '합계',      supplySum + vatSum,   FONT_SUM_LBL   as ExcelJS.Font, undefined],
    [25, '할인 금액', 0,                    FONT_SUM_LBL   as ExcelJS.Font, undefined],
    [26, '최종 견적', finalTotal,           FONT_FINAL_LBL as ExcelJS.Font, FILL_YELLOW],
  ];
  totals.forEach(([r, lbl, val, lblFont, valFill]) => {
    ws.getRow(r).height = 24;
    ws.mergeCells(`D${r}:E${r}`);
    ws.getCell(`D${r}`).value = lbl;
    s(ws.getCell(`D${r}`), { font: lblFont, fill: valFill ?? FILL_LABEL_L, border: B_LTB, align: RIGHT });
    ws.mergeCells(`F${r}:G${r}`);
    ws.getCell(`F${r}`).value = val;
    s(ws.getCell(`F${r}`), { font: r === 26 ? FONT_FINAL_VAL as ExcelJS.Font : FONT_VALUE as ExcelJS.Font, fill: valFill, border: B_LTB, align: RIGHT, numFmt: NUM_KRW });
  });

  /* 품목목록 sheet */
  const ws2 = wb.addWorksheet('품목목록');
  ws2.getColumn('A').width = 40;
  ws2.getColumn('B').width = 12;
  ws2.addRow(['품목', '단가']).font = { bold: true };
  [
    ['LeRobot SO-ARM 101 Max', 500000],
    ['Top 카메라홀더 + 카메라모듈 + 셀카봉', 50000],
    ['Wrist 카메라홀더 + 카메라모듈', 40000],
    ['Belly 카메라홀더 + 카메라모듈', 40000],
    ['고급형 클램프 4pcs', 20000],
    ['LeRobot SO-ARM 101 Open Gripper', 70000],
    ['LeRobot SO-ARM 101 Max - 서보 모터 STS3215 (7.4v/19kg)', 30000],
    ['LeRobot SO-ARM 101 Max - 서보 모터 STS3215 (12v/30kg)', 35000],
    ['Dual SO-ARM (Only Bridge)', 230000],
    ['Dual SO-ARM Full Set', 1230000],
    ['LeRobot SO-ARM101 Max - 3D 프린팅 부품 제외', 440000],
    ['LeRobot SO-ARM101 Max - 3D 프린팅 부품', 70000],
    ['리더암 모터 세트 (7.4v/19kg)', 180000],
    ['팔로워암 모터 세트 (12v/30kg)', 210000],
    ['모터드라이브 모듈', 10000],
    ['전원 어댑터', 10000],
    ['USB to C 케이블', 2000],
    ['조립서비스', 90000],
  ].forEach(([name, price]) => ws2.addRow([name, price]));

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
