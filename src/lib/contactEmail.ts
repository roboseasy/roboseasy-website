import type { PricedQuote } from '../data/quoteItems';

export interface ContactPayload {
  name: string;
  title?: string;
  email: string;
  phone: string;
  org?: string;
  type: 'purchase' | 'as' | 'workshop' | 'corp_edu' | 'etc';
  message: string;
  shipto?: string;
  isBuyer?: string;
  purchaseMonth?: string;
  /** 클라이언트가 보낸 { name, qty }[] — 금액은 서버가 priceQuoteItems로 재계산 */
  items?: unknown;
}

export const TYPE_LABEL: Record<string, string> = {
  purchase: '로봇 구매 문의',
  as: '로봇 AS 문의',
  workshop: '워크샵 문의',
  corp_edu: '교육 문의',
  etc: '기타 문의',
};

// 사용자 입력은 전부 이스케이프 후 HTML에 삽입 (메일 HTML 주입 방지)
export const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// quote: priceQuoteItems가 서버에서 재계산한 견적 (purchase 외 유형은 null)
export function buildEmailHtml(data: ContactPayload, quote: PricedQuote | null): string {
  const typeLabel = TYPE_LABEL[data.type] ?? esc(data.type);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const quoteNo = `Q-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const td = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 14px;width:110px;font-weight:600;color:#1a0a3d;background:#f5f4fa;border-bottom:1px solid #e8e5f5;white-space:nowrap;">${label}</td>
      <td style="padding:10px 14px;color:#333;border-bottom:1px solid #e8e5f5;">${value}</td>
    </tr>`;

  const customerRows = [
    td('성함', esc(data.name) + (data.title ? ` (${esc(data.title)})` : '')),
    td('이메일', `<a href="mailto:${esc(data.email)}" style="color:#4472c4;">${esc(data.email)}</a>`),
    td('연락처', esc(data.phone)),
    data.org ? td('소속', esc(data.org)) : '',
    data.type === 'purchase' && data.shipto ? td('배송 주소', esc(data.shipto)) : '',
    data.type === 'as' && data.isBuyer ? td('구매자 여부', data.isBuyer === 'yes' ? '네' : '아니오') : '',
    data.type === 'as' && data.purchaseMonth ? td('구매 날짜', esc(data.purchaseMonth)) : '',
  ].filter(Boolean).join('');

  let purchaseSection = '';
  if (data.type === 'purchase' && quote && quote.items.length > 0) {
    const itemRows = quote.items.map((it, i) => `
      <tr style="background:${i % 2 === 1 ? '#f9f9fb' : '#fff'};">
        <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e8e5f5;">${i+1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e5f5;">${esc(it.name)}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${it.qty.toLocaleString('ko-KR')}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${it.unitPrice.toLocaleString('ko-KR')}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${it.supply.toLocaleString('ko-KR')}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e5f5;">${it.vat.toLocaleString('ko-KR')}</td>
      </tr>`).join('');
    const s = quote.supplySum, v = quote.vatSum, f = quote.total;
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
      <div style="font-size:14px;color:#333;line-height:1.8;white-space:pre-wrap;background:#f9f9fb;border-radius:6px;padding:14px 16px;">${esc(data.message)}</div>
    </div>
  </div>
</body></html>`;
}
