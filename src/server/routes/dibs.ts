import { Hono } from 'hono';
import { requireAuth, type AuthEnv } from '../middleware/auth';
import { UUID_RE } from '../lib/validation';

// 찜 (2차 — backend.md §3 쇼핑) — 회원 전용, RLS dibs_*_own으로 본인 행만.
// 장바구니와 달리 미출시(comingSoon 등 is_active=false) 제품도 찜 허용 — 출시 대기 용도.
export const dibs = new Hono<AuthEnv>();

dibs.use('/dibs', requireAuth);
dibs.use('/dibs/:id', requireAuth);

type JoinedRow = {
  dibs_id: string;
  product_sku: string;
  products: { product_name: string; product_price: number; is_active: boolean } | null;
};

/* ── 찜 목록 ── */
dibs.get('/dibs', async (c) => {
  const { data, error } = await c.get('db')
    .from('dibs')
    .select('dibs_id, product_sku, products(product_name, product_price, is_active)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('dibs 조회 오류:', error);
    return c.json({ error: '찜 목록을 불러오지 못했습니다.' }, 500);
  }
  return c.json({
    items: ((data ?? []) as unknown as JoinedRow[]).map((r) => ({
      dibsId: r.dibs_id,
      productSku: r.product_sku,
      productName: r.products?.product_name ?? r.product_sku,
      price: Number(r.products?.product_price ?? 0),
      isActive: r.products?.is_active ?? false,
    })),
  });
});

/* ── 찜 추가 — 이미 찜한 제품이면 멱등 성공 (UNIQUE user_id+sku) ── */
dibs.post('/dibs', async (c) => {
  let body: { productSku?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }
  const sku = typeof body.productSku === 'string' ? body.productSku.trim() : '';
  if (!sku || sku.length > 50) return c.json({ error: '제품을 선택해 주세요.' }, 400);

  // 사전 조회 없이 바로 insert — 충돌·FK는 오류 코드로 분기(첫 찜은 왕복 1회로 단축).
  const db = c.get('db');
  const { data: row, error } = await db
    .from('dibs')
    .insert({ user_id: c.get('user').id, product_sku: sku })
    .select('dibs_id')
    .single();
  if (error) {
    // 이미 찜됨(23505): 기존 dibs_id를 반환해 클라이언트 토글 상태(해제 가능)를 유지
    if (error.code === '23505') {
      const { data: existing } = await db.from('dibs').select('dibs_id').eq('product_sku', sku).maybeSingle();
      return c.json({ success: true, dibsId: existing?.dibs_id ?? null });
    }
    // 존재하지 않는 제품(FK 23503)
    if (error.code === '23503') return c.json({ error: '존재하지 않는 제품입니다.' }, 400);
    console.error('dibs 추가 오류:', error);
    return c.json({ error: '찜하지 못했습니다.' }, 500);
  }
  return c.json({ success: true, dibsId: row.dibs_id }, 201);
});

/* ── 찜 삭제 ── */
dibs.delete('/dibs/:id', async (c) => {
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: '찜 목록에 없는 항목입니다.' }, 404);

  const { data, error } = await c.get('db')
    .from('dibs')
    .delete()
    .eq('dibs_id', id)
    .select('dibs_id');
  if (error) {
    console.error('dibs 삭제 오류:', error);
    return c.json({ error: '삭제하지 못했습니다.' }, 500);
  }
  if (!data?.length) return c.json({ error: '찜 목록에 없는 항목입니다.' }, 404);
  return c.json({ success: true });
});
