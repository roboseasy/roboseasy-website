import path from 'path';
import ExcelJS from 'exceljs';
import type { PricedQuote } from '../data/quoteItems';

const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'excel', '견적서_양식_자동화.xlsx');

export interface QuoteData {
  name: string;
  title?: string;
  email: string;
  phone: string;
  org?: string;
  shipto?: string;
}

// 셀 기록 전 문자열 강제 — 클라이언트 JSON의 객체 값({ formula: … } 등)이
// ExcelJS 수식으로 해석되는 것을 차단 (수식 주입 방지)
const asStr = (v: unknown): string => String(v ?? '');

// 금액·수량(quote)은 priceQuoteItems가 서버에서 재계산한 숫자만 담고 있음
export async function buildQuoteExcel(data: QuoteData, quote: PricedQuote): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.getWorksheet('견적서')!;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const quoteNo = `Q-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  ws.getCell('B4').value = quoteNo;
  ws.getCell('B5').value = asStr(data.org);
  ws.getCell('B6').value = asStr(data.name) + (data.title ? ` (${asStr(data.title)})` : '');
  ws.getCell('B7').value = asStr(data.phone);
  ws.getCell('B8').value = asStr(data.email);
  ws.getCell('B9').value = asStr(data.shipto);

  for (let i = 0; i < 7; i++) {
    const row = 14 + i;
    const item = quote.items[i];
    ws.getCell(`B${row}`).value = item?.name ?? '';
    ws.getCell(`C${row}`).value = item?.qty ?? null;
    ws.getCell(`D${row}`).value = item?.unitPrice ?? null;
    ws.getCell(`E${row}`).value = item?.supply ?? null;
    ws.getCell(`F${row}`).value = item?.vat ?? null;
  }

  ws.getCell('F22').value = quote.supplySum;
  ws.getCell('F23').value = quote.vatSum;
  ws.getCell('F24').value = quote.supplySum + quote.vatSum;
  ws.getCell('F25').value = 0;
  ws.getCell('F26').value = quote.total;

  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}
