import { Hono } from 'hono';
import { buildQuoteExcel, type QuoteData } from '../../lib/buildQuoteExcel';
import { priceQuoteItems } from '../../data/quoteItems';
import { rateLimit, clientIp } from '../middleware/rateLimit';

export const quoteDownload = new Hono();

// 비인증 + 엑셀 생성(CPU·메모리 비쌈) → IP rate limit (/contact와 동일 정책 — 버스트 5, 이후 5분당 1회)
quoteDownload.post('/quote-download', rateLimit({ name: 'quote', capacity: 5, refillPerSec: 1 / 300, keyFn: clientIp }), async (c) => {
  let data: QuoteData & { items?: unknown };
  try {
    data = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  if (!data.name) {
    return c.json({ error: '필수 항목이 누락되었습니다.' }, 400);
  }
  // 엑셀 셀·파일명 헤더까지 흘러가는 값 — 폭주 방지 상한 (contact.ts와 동일 한도)
  if (typeof data.name !== 'string' || data.name.length > 100) {
    return c.json({ error: '입력 값이 허용 길이를 초과했습니다.' }, 400);
  }

  // 금액은 클라이언트 값을 쓰지 않고 단가표(quoteItems)로 서버가 재계산
  const quote = priceQuoteItems(data.items ?? []);
  if (!quote) {
    return c.json({ error: '견적 항목이 올바르지 않습니다.' }, 400);
  }

  try {
    const buffer = await buildQuoteExcel(data, quote);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    const filename = encodeURIComponent(`견적서_${data.name}_${stamp}.xlsx`);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (err) {
    console.error('Excel 생성 오류:', err);
    return c.json({ error: 'Excel 생성 중 오류가 발생했습니다.' }, 500);
  }
});
