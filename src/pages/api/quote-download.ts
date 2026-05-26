export const prerender = false;

import type { APIRoute } from 'astro';
import { buildQuoteExcel, type QuoteData } from '../../lib/buildQuoteExcel';

export const POST: APIRoute = async ({ request }) => {
  let data: QuoteData;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청입니다.' }), { status: 400 });
  }

  if (!data.name) {
    return new Response(JSON.stringify({ error: '필수 항목이 누락되었습니다.' }), { status: 400 });
  }

  try {
    const buffer = await buildQuoteExcel(data);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    const filename = encodeURIComponent(`견적서_${data.name}_${stamp}.xlsx`);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (err) {
    console.error('Excel 생성 오류:', err);
    return new Response(JSON.stringify({ error: 'Excel 생성 중 오류가 발생했습니다.' }), { status: 500 });
  }
};
