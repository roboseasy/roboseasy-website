import { Hono } from 'hono';
import { MAX_QTY } from '../../data/order';
import { requireAuth, type AuthEnv } from '../middleware/auth';
import { UUID_RE } from '../lib/validation';

// 장바구니 (2차 — backend.md §3 쇼핑) — 회원 전용, RLS cart_items_*_own으로 본인 행만.
// 수량은 UNIQUE(user_id, product_sku)라 행 하나에 quantity로 관리 — POST 중복 담기는 수량 합산.
export const cart = new Hono<AuthEnv>();

cart.use('/cart_items', requireAuth);
cart.use('/cart_items/:id', requireAuth);

type JoinedRow = {
  cart_id: string;
  product_sku: string;
  quantity: number;
  products: { product_name: string; product_price: number; is_active: boolean } | null;
};

/* ── 장바구니 조회 — products 조인으로 표시용 이름·현재가 포함 (이미지는 프론트 정적 데이터에서) ── */
cart.get('/cart_items', async (c) => {
  const { data, error } = await c.get('db')
    .from('cart_items')
    .select('cart_id, product_sku, quantity, products(product_name, product_price, is_active)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('cart 조회 오류:', error);
    return c.json({ error: '장바구니를 불러오지 못했습니다.' }, 500);
  }
  return c.json({
    items: ((data ?? []) as unknown as JoinedRow[]).map((r) => ({
      cartId: r.cart_id,
      productSku: r.product_sku,
      quantity: r.quantity,
      productName: r.products?.product_name ?? r.product_sku,
      price: Number(r.products?.product_price ?? 0),
      isActive: r.products?.is_active ?? false, // 담은 뒤 판매 중지된 제품 — 프론트에서 주문 불가 표시
    })),
  });
});

/* ── 장바구니 추가 — 이미 담긴 제품이면 수량 합산 ── */
cart.post('/cart_items', async (c) => {
  let body: { productSku?: string; quantity?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  const sku = typeof body.productSku === 'string' ? body.productSku.trim() : '';
  const qty = Number(body.quantity ?? 1);
  if (!sku || sku.length > 50) return c.json({ error: '제품을 선택해 주세요.' }, 400);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    return c.json({ error: `수량은 1~${MAX_QTY} 사이여야 합니다.` }, 400);
  }

  const db = c.get('db');

  // 판매 중(is_active) 제품만 담기 허용 — 미출시·내려간 제품 차단
  const { data: product } = await db
    .from('products')
    .select('product_sku, is_active')
    .eq('product_sku', sku)
    .maybeSingle();
  if (!product || !product.is_active) {
    return c.json({ error: '판매 중인 제품이 아닙니다.' }, 400);
  }

  // UNIQUE(user_id, product_sku) — 기존 행이 있으면 수량 합산(상한 99)
  const uid = c.get('user').id;
  const { data: existing } = await db
    .from('cart_items')
    .select('cart_id, quantity')
    .eq('product_sku', sku)
    .maybeSingle();

  if (existing) {
    const next = Math.min(existing.quantity + qty, MAX_QTY);
    const { error } = await db.from('cart_items').update({ quantity: next }).eq('cart_id', existing.cart_id);
    if (error) {
      console.error('cart 수량 합산 오류:', error);
      return c.json({ error: '장바구니에 담지 못했습니다.' }, 500);
    }
    return c.json({ success: true, cartId: existing.cart_id, quantity: next });
  }

  const { data: row, error } = await db
    .from('cart_items')
    .insert({ user_id: uid, product_sku: sku, quantity: qty })
    .select('cart_id, quantity')
    .single();
  if (error) {
    // 23505: 동시 요청으로 UNIQUE 충돌 — 드문 경쟁 상황, 재시도 안내
    if (error.code === '23505') return c.json({ error: '이미 담긴 제품입니다. 다시 시도해 주세요.' }, 409);
    console.error('cart 추가 오류:', error);
    return c.json({ error: '장바구니에 담지 못했습니다.' }, 500);
  }
  return c.json({ success: true, cartId: row.cart_id, quantity: row.quantity }, 201);
});

/* ── 수량 변경 ── */
cart.patch('/cart_items/:id', async (c) => {
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: '장바구니에 없는 항목입니다.' }, 404);

  let body: { quantity?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }
  const qty = Number(body.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    return c.json({ error: `수량은 1~${MAX_QTY} 사이여야 합니다.` }, 400);
  }

  const { data, error } = await c.get('db')
    .from('cart_items')
    .update({ quantity: qty })
    .eq('cart_id', id)
    .select('cart_id, quantity');
  if (error) {
    console.error('cart 수정 오류:', error);
    return c.json({ error: '수량을 변경하지 못했습니다.' }, 500);
  }
  if (!data?.length) return c.json({ error: '장바구니에 없는 항목입니다.' }, 404); // RLS로 타인 행도 여기
  return c.json({ success: true, cartId: data[0].cart_id, quantity: data[0].quantity });
});

/* ── 삭제 ── */
cart.delete('/cart_items/:id', async (c) => {
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: '장바구니에 없는 항목입니다.' }, 404);

  const { data, error } = await c.get('db')
    .from('cart_items')
    .delete()
    .eq('cart_id', id)
    .select('cart_id');
  if (error) {
    console.error('cart 삭제 오류:', error);
    return c.json({ error: '삭제하지 못했습니다.' }, 500);
  }
  if (!data?.length) return c.json({ error: '장바구니에 없는 항목입니다.' }, 404);
  return c.json({ success: true });
});
