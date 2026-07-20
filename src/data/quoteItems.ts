// 견적 단가표 — 클라이언트(contact.astro 견적 폼)와 서버(/api/v1/contact·/api/v1/quote-download)가
// 공유하는 단일 원본. 금액(단가·공급가액·부가세·합계)은 서버가 이 표로 재계산한다
// — 클라이언트가 보낸 금액은 신뢰하지 않음(견적서 위조 방지).

export interface QuoteCatalogItem {
  name: string;
  /** 단가(원) */
  price: number;
}

export const QUOTE_ITEMS: QuoteCatalogItem[] = [
  { name: 'A-Ba(SO-ARM101) Max', price: 500000 },
  { name: 'Top 카메라홀더 + 카메라모듈 + 셀카봉', price: 50000 },
  { name: 'Wrist 카메라홀더 + 카메라모듈', price: 40000 },
  { name: 'Belly 카메라홀더 + 카메라모듈', price: 40000 },
  { name: '고급형 클램프 4pcs', price: 20000 },
  { name: 'A-Ba(SO-ARM101) Open Gripper', price: 70000 },
  { name: 'A-Ba(SO-ARM101) Max - 서보 모터 STS3215 (7.4v/19kg)', price: 30000 },
  { name: 'A-Ba(SO-ARM101) Max - 서보 모터 STS3215 (12v/30kg)', price: 35000 },
  { name: 'Dual A-Ba(Dual SO-ARM) (Only Bridge)', price: 230000 },
  { name: 'Dual A-Ba(Dual SO-ARM) Full Set', price: 1230000 },
  { name: 'A-Ba(SO-ARM101) Max - 3D 프린팅 부품 제외', price: 440000 },
  { name: 'A-Ba(SO-ARM101) Max - 3D 프린팅 부품', price: 70000 },
  { name: '리더암 모터 세트 (7.4v/19kg)', price: 180000 },
  { name: '팔로워암 모터 세트 (12v/30kg)', price: 210000 },
  { name: '모터드라이브 모듈', price: 10000 },
  { name: '전원 어댑터', price: 10000 },
  { name: 'USB to C 케이블', price: 2000 },
  { name: '조립서비스', price: 90000 },
];

/** 부가세: 공급가액의 10%를 일의 자리에서 반올림(10원 단위) */
export function lineAmounts(price: number, qty: number): { supply: number; vat: number } {
  const supply = price * qty;
  const vat = Math.round((supply * 0.1) / 10) * 10;
  return { supply, vat };
}

export interface PricedQuoteItem {
  name: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vat: number;
}

export interface PricedQuote {
  items: PricedQuoteItem[];
  supplySum: number;
  vatSum: number;
  total: number;
}

/** 클라이언트가 보낸 items(JSON)를 단가표로 검증·재계산.
    { name, qty }만 읽으며(그 외 필드 무시), 알 수 없는 품목·잘못된 수량·형식 오류면 null. */
export function priceQuoteItems(raw: unknown): PricedQuote | null {
  if (!Array.isArray(raw) || raw.length > 100) return null;
  const items: PricedQuoteItem[] = [];
  let supplySum = 0;
  let vatSum = 0;
  for (const r of raw) {
    const name = (r as { name?: unknown } | null)?.name;
    const qty = Number((r as { qty?: unknown } | null)?.qty);
    const item = QUOTE_ITEMS.find((it) => it.name === name);
    if (!item || !Number.isInteger(qty) || qty <= 0 || qty > 100000) return null;
    const { supply, vat } = lineAmounts(item.price, qty);
    items.push({ name: item.name, qty, unitPrice: item.price, supply, vat });
    supplySum += supply;
    vatSum += vat;
  }
  return { items, supplySum, vatSum, total: supplySum + vatSum };
}
