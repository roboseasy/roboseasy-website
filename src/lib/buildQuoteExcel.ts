import path from 'path';
import ExcelJS from 'exceljs';

// 단가의 원본은 이 템플릿의 '품목별 구매단가' 시트다 — 문의 페이지 품목 목록(빌드 타임)과
// 견적서 수식(VLOOKUP)이 모두 여기를 읽는다. 단가를 바꾸려면 엑셀 파일만 교체하면 된다.
const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'excel', '견적서-자동계산.xlsx');
const PRICE_SHEET = '품목별 구매단가';
const FIRST_ROW = 13;  // 견적서 품목 행 13~20 (8행)
const ROW_COUNT = 8;

export interface PriceItem {
  name: string;
  price: number;
}

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
  items?: Pick<QuoteItem, 'name' | 'qty'>[];
}

function readPriceList(wb: ExcelJS.Workbook): PriceItem[] {
  const items: PriceItem[] = [];
  wb.getWorksheet(PRICE_SHEET)!.eachRow((row, n) => {
    if (n === 1) return;
    const name = row.getCell(1).text;
    const price = row.getCell(2);
    // 단가 칸이 수식이면 계산 결과를 쓴다. 견적서 D열이 ROUND(VLOOKUP(...),0)이라 정수로 맞춘다
    if (name.trim()) items.push({ name, price: Math.round(Number(price.result ?? price.value)) });
  });
  return items;
}

export async function loadPriceList(): Promise<PriceItem[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  return readPriceList(wb);
}

export async function buildQuoteExcel(data: QuoteData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.getWorksheet('견적서')!;
  const priceList = readPriceList(wb);
  const prices = new Map(priceList.map(it => [it.name, it.price]));

  // 템플릿에 남은 옛 숨김 시트 — 예전 단가가 들어 있고 어떤 수식도 참조하지 않는다. 고객에게 나가지 않게 뺀다
  const legacySheet = wb.getWorksheet('품목목록');
  if (legacySheet) wb.removeWorksheet(legacySheet.id);

  // 템플릿이 가격표 탭을 연 채 저장돼 있다 — 받는 사람이 견적서 탭부터 보도록
  wb.views[0].activeTab = 0;
  // 수식은 살려 두고 계산 결과만 채운다. 엑셀은 열 때 다시 계산하고,
  // 재계산을 안 하는 미리보기(메일 첨부 등)는 아래에서 넣은 결과값을 보여준다
  wb.calcProperties.fullCalcOnLoad = true;
  // E·F열은 공유 수식(E13이 E14~E20의 원본)이라 값 모양을 그대로 두고 result만 바꾼다
  const setResult = (addr: string, result: number | string) => {
    const cell = ws.getCell(addr);
    cell.value = { ...(cell.value as ExcelJS.CellFormulaValue), result };
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const quoteNo = `Q-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  ws.getCell('B4').value = quoteNo;
  ws.getCell('B5').value = data.org ?? '';
  ws.getCell('B6').value = data.name + (data.title ? ` (${data.title})` : '');
  ws.getCell('B7').value = data.phone;
  ws.getCell('B8').value = data.email;

  // 가격표에 없는 품목은 VLOOKUP이 빈칸이 되므로 넣지 않는다. 단가도 클라이언트 값이 아니라 가격표 기준
  const items = (data.items ?? [])
    .filter(it => prices.has(it.name) && Number.isInteger(it.qty) && it.qty > 0)
    .slice(0, ROW_COUNT);
  let supplySum = 0, vatSum = 0;
  items.forEach((it, i) => {
    const row = FIRST_ROW + i;
    const unit = prices.get(it.name)!;
    const supply = it.qty * unit;
    const vat = Math.round(supply * 0.1);  // F열 ROUND(E*0.1,0)
    ws.getCell(`B${row}`).value = it.name;
    ws.getCell(`C${row}`).value = it.qty;
    setResult(`D${row}`, unit);
    setResult(`E${row}`, supply);
    setResult(`F${row}`, vat);
    supplySum += supply; vatSum += vat;
  });

  const finalTotal = Math.floor((supplySum + vatSum) / 100) * 100;  // F27 ROUNDDOWN(.../100,0)*100
  setResult('F23', supplySum);
  setResult('F24', vatSum);
  setResult('F25', supplySum + vatSum);
  setResult('F27', finalTotal);
  setResult('C10', `₩ ${finalTotal.toLocaleString('ko-KR')} (부가세 포함)`);

  // ExcelJS는 OFFSET으로 정의된 이름('품목')을 버려서 드롭다운이 깨진다 — 같은 범위를 직접 지정한다
  const listRange = `'${PRICE_SHEET}'!$A$2:$A$${priceList.length + 1}`;
  for (let row = FIRST_ROW; row < FIRST_ROW + ROW_COUNT; row++) {
    const cell = ws.getCell(`B${row}`);
    cell.dataValidation = { ...cell.dataValidation, formulae: [listRange] };
  }

  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}
