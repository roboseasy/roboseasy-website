import { Hono } from 'hono';
import { requireAuth, requireAdmin, type AuthEnv } from '../middleware/auth';

// 관리자 API — /api/admin/* 전체가 requireAuth → requireAdmin 체인으로 보호됨.
// 조회는 유저 토큰(RLS의 admin 정책)으로 수행 — service role 불필요(이중 방어).
export const admin = new Hono<AuthEnv>();

admin.use('*', requireAuth, requireAdmin);

const PAGE_SIZE = 50;
const pageOf = (c: { req: { query: (k: string) => string | undefined } }) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
  return { page, from: (page - 1) * PAGE_SIZE, to: page * PAGE_SIZE - 1 };
};

// uuid 형식이 아닌 :id는 Postgres 캐스팅 에러(22P02 → 500)가 나기 전에 404로 처리
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const userDto = (r: Record<string, unknown>) => ({
  userId: r.user_id,
  email: r.user_email,
  name: r.user_name,
  phone: r.user_phone,
  postcode: r.user_postcode,
  address: r.user_address,
  addressDetail: r.user_address_detail,
  role: r.role,
  marketingConsent: r.marketing_consent,
  createdAt: r.created_at,
});

const orderItemDto = (r: Record<string, unknown>) => ({
  oitemId: r.oitem_id,
  productSku: r.product_sku,
  quantity: r.quantity,
  unitPrice: r.unit_price,
});

const orderDto = (r: Record<string, unknown>) => ({
  orderId: r.order_id,
  userId: r.user_id,
  totalPrice: r.total_price,
  status: r.status,
  receiverName: r.receiver_name,
  receiverPhone: r.receiver_phone,
  shippingAddress: r.shipping_address,
  courier: r.courier,
  trackingNumber: r.tracking_number,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const contactDto = (r: Record<string, unknown>) => ({
  contactId: r.contact_id,
  channel: r.channel,
  userId: r.user_id,
  orderId: r.order_id,
  productSku: r.product_sku,
  contactType: r.contact_type,
  name: r.name,
  email: r.email,
  phone: r.phone,
  org: r.org,
  message: r.message,
  isDispute: r.is_dispute,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/* ── 유저 조회 (ADM-04·05) ── */
admin.get('/users', async (c) => {
  const { page, from, to } = pageOf(c);
  const { data, count, error } = await c.get('db')
    .from('profiles')
    .select('user_id, user_email, user_name, user_phone, user_postcode, user_address, user_address_detail, role, marketing_consent, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    console.error('admin users 조회 오류:', error);
    return c.json({ error: '유저 목록을 불러오지 못했습니다.' }, 500);
  }
  return c.json({ users: (data ?? []).map(userDto), total: count ?? 0, page });
});

admin.get('/users/:id', async (c) => {
  if (!UUID_RE.test(c.req.param('id'))) return c.json({ error: '존재하지 않는 유저입니다.' }, 404);
  const { data, error } = await c.get('db')
    .from('profiles')
    .select('user_id, user_email, user_name, user_phone, user_postcode, user_address, user_address_detail, role, marketing_consent, created_at')
    .eq('user_id', c.req.param('id'))
    .maybeSingle();
  if (error) {
    console.error('admin user 조회 오류:', error);
    return c.json({ error: '유저 정보를 불러오지 못했습니다.' }, 500);
  }
  if (!data) return c.json({ error: '존재하지 않는 유저입니다.' }, 404);
  return c.json(userDto(data));
});

/* ── 주문 조회 (ADM-02·03) — 1차에는 데이터 없음, 조회 경로만 제공 ── */
admin.get('/orders', async (c) => {
  const { page, from, to } = pageOf(c);
  let query = c.get('db')
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  const status = c.req.query('status');
  if (status) query = query.eq('status', status);
  const { data, count, error } = await query;
  if (error) {
    console.error('admin orders 조회 오류:', error);
    return c.json({ error: '주문 목록을 불러오지 못했습니다.' }, 500);
  }
  return c.json({ orders: (data ?? []).map(orderDto), total: count ?? 0, page });
});

admin.get('/orders/:id', async (c) => {
  if (!UUID_RE.test(c.req.param('id'))) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
  const { data, error } = await c.get('db')
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_id', c.req.param('id'))
    .maybeSingle();
  if (error) {
    console.error('admin order 조회 오류:', error);
    return c.json({ error: '주문 정보를 불러오지 못했습니다.' }, 500);
  }
  if (!data) return c.json({ error: '존재하지 않는 주문입니다.' }, 404);
  return c.json({
    ...orderDto(data),
    items: ((data.order_items as Record<string, unknown>[]) ?? []).map(orderItemDto),
  });
});

/* ── 문의 관리 (ADM-07) — channel·status·is_dispute 필터, 상태·분쟁 표시 갱신 ── */
admin.get('/contacts', async (c) => {
  const { page, from, to } = pageOf(c);
  let query = c.get('db')
    .from('contacts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  const channel = c.req.query('channel');
  const status = c.req.query('status');
  const isDispute = c.req.query('is_dispute');
  if (channel) query = query.eq('channel', channel);
  if (status) query = query.eq('status', status);
  if (isDispute === 'true' || isDispute === 'false') query = query.eq('is_dispute', isDispute === 'true');
  const { data, count, error } = await query;
  if (error) {
    console.error('admin contacts 조회 오류:', error);
    return c.json({ error: '문의 목록을 불러오지 못했습니다.' }, 500);
  }
  return c.json({ contacts: (data ?? []).map(contactDto), total: count ?? 0, page });
});

const CONTACT_STATUS = ['RECEIVED', 'IN_PROGRESS', 'DONE'] as const;

admin.patch('/contacts/:id', async (c) => {
  if (!UUID_RE.test(c.req.param('id'))) return c.json({ error: '존재하지 않는 문의입니다.' }, 404);
  let body: { status?: string; isDispute?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!CONTACT_STATUS.includes(body.status as (typeof CONTACT_STATUS)[number])) {
      return c.json({ error: `status는 ${CONTACT_STATUS.join('/')} 중 하나여야 합니다.` }, 400);
    }
    update.status = body.status;
  }
  // is_dispute 표시가 보유기간(일반 1년/분쟁 3년)을 가르는 장치 — backend.md §6
  if (typeof body.isDispute === 'boolean') update.is_dispute = body.isDispute;

  if (Object.keys(update).length === 0) {
    return c.json({ error: '수정할 항목이 없습니다.' }, 400);
  }

  const { data, error } = await c.get('db')
    .from('contacts')
    .update(update)
    .eq('contact_id', c.req.param('id'))
    .select()
    .maybeSingle();
  if (error) {
    console.error('admin contact 수정 오류:', error);
    return c.json({ error: '문의 상태 변경에 실패했습니다.' }, 500);
  }
  if (!data) return c.json({ error: '존재하지 않는 문의입니다.' }, 404);
  return c.json({ success: true, contact: contactDto(data) });
});
