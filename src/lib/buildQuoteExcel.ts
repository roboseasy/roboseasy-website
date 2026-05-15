import path from 'path';
import ExcelJS from 'exceljs';

const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'excel', '견적서_양식_자동화.xlsx');

export interface QuoteItem {
  name: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vat: number;
}

export interface QuoteData {
  name: string;
  title?: string;
  email: string;
  phone: string;
  org?: string;
  shipto?: string;
  items?: QuoteItem[];
  supplySum?: number;
  vatSum?: number;
  total?: number;
}

export async function buildQuoteExcel(data: QuoteData): Promise<Buffer> {
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
