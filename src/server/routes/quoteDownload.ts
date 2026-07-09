import { Hono } from 'hono';
import { buildQuoteExcel, type QuoteData } from '../../lib/buildQuoteExcel';

export const quoteDownload = new Hono();

quoteDownload.post('/quote-download', async (c) => {
  let data: QuoteData;
  try {
    data = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  if (!data.name) {
    return c.json({ error: '필수 항목이 누락되었습니다.' }, 400);
  }

  try {
    const buffer = await buildQuoteExcel(data);
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
