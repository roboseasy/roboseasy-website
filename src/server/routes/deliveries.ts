import { Hono } from 'hono';
import { requireAuth, type AuthEnv } from '../middleware/auth';
import { UUID_RE } from '../lib/validation';

// 배송지 주소록 — 회원 전용, RLS deliveries_*_own으로 본인 행만 (cart_items·dibs와 동일 구조).
// 주문의 배송지는 orders에 스냅샷으로 따로 저장되므로, 여기 행을 고쳐도 기존 주문은 변하지 않는다.
export const deliveries = new Hono<AuthEnv>();

deliveries.use('/deliveries', requireAuth);
deliveries.use('/deliveries/:id', requireAuth);

// 회원당 저장 개수 상한 — 목록 UI(셀렉트)가 다루기 쉬운 범위로 제한
const MAX_DELIVERIES = 5;

// deliveries 컬럼(varchar) 초과를 22001 전에 400으로 (orders.ts와 동일 접근)
const FIELD_LIMITS = {
  deliveryLabel: 50,
  receiverName: 100,
  receiverPhone: 20,
  address: 255,
  addressDetail: 255,
} as const;

const dto = (r: Record<string, unknown>) => ({
  deliveryId: r.delivery_id,
  deliveryLabel: r.delivery_label,
  receiverName: r.receiver_name,
  receiverPhone: r.receiver_phone,
  postcode: r.postcode,
  address: r.address,
  addressDetail: r.address_detail,
  createdAt: r.created_at,
});

const SELECT_COLS =
  'delivery_id, delivery_label, receiver_name, receiver_phone, postcode, address, address_detail, created_at';

type Fields = {
  delivery_label: string | null;
  receiver_name: string;
  receiver_phone: string;
  postcode: string;
  address: string;
  address_detail: string;
};

// 입력 검증 — 통과 시 DB 컬럼 형태로, 실패 시 사용자 메시지를 반환
function parseFields(body: Record<string, unknown>): { fields: Fields } | { error: string } {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const deliveryLabel = str(body.deliveryLabel);
  const receiverName = str(body.receiverName);
  const receiverPhone = str(body.receiverPhone);
  const postcode = str(body.postcode);
  const address = str(body.address);
  const addressDetail = str(body.addressDetail);

  if (!receiverName || !receiverPhone || !address) {
    return { error: '수령인·연락처·배송지를 입력해 주세요.' };
  }
  if (!/^\d{5}$/.test(postcode)) {
    return { error: '우편번호가 올바르지 않습니다.' };
  }
  const lengths = { deliveryLabel, receiverName, receiverPhone, address, addressDetail };
  for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
    if (lengths[key as keyof typeof FIELD_LIMITS].length > limit) {
      return { error: '입력값이 너무 깁니다.' };
    }
  }
  return {
    fields: {
      delivery_label: deliveryLabel || null, // 배송지명은 선택 — 미입력은 null
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      postcode,
      address,
      address_detail: addressDetail,
    },
  };
}

/* ── 목록 — 최신순 ── */
deliveries.get('/deliveries', async (c) => {
  const { data, error } = await c.get('db')
    .from('deliveries')
    .select(SELECT_COLS)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('deliveries 조회 오류:', error);
    return c.json({ error: '배송지를 불러오지 못했습니다.' }, 500);
  }
  return c.json({ deliveries: (data ?? []).map(dto) });
});

/* ── 추가 — 회원당 MAX_DELIVERIES개까지 ── */
deliveries.post('/deliveries', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  const parsed = parseFields(body);
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);

  const db = c.get('db');
  const { count, error: countError } = await db
    .from('deliveries')
    .select('delivery_id', { count: 'exact', head: true });
  if (countError) {
    console.error('deliveries 개수 조회 오류:', countError);
    return c.json({ error: '배송지를 저장하지 못했습니다.' }, 500);
  }
  if ((count ?? 0) >= MAX_DELIVERIES) {
    return c.json({ error: `배송지는 최대 ${MAX_DELIVERIES}개까지 저장할 수 있습니다.` }, 400);
  }

  const { data, error } = await db
    .from('deliveries')
    .insert({ user_id: c.get('user').id, ...parsed.fields })
    .select(SELECT_COLS)
    .single();
  if (error || !data) {
    console.error('deliveries 생성 오류:', error);
    return c.json({ error: '배송지를 저장하지 못했습니다.' }, 500);
  }
  return c.json(dto(data), 201);
});

/* ── 수정 — 전체 필드 교체(부분 수정 없음: 주소는 우편번호·주소가 한 벌로만 의미가 있음) ── */
deliveries.patch('/deliveries/:id', async (c) => {
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: '존재하지 않는 배송지입니다.' }, 404);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '잘못된 요청입니다.' }, 400);
  }

  const parsed = parseFields(body);
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);

  const { data, error } = await c.get('db')
    .from('deliveries')
    .update(parsed.fields)
    .eq('delivery_id', id)
    .select(SELECT_COLS)
    .maybeSingle();
  if (error) {
    console.error('deliveries 수정 오류:', error);
    return c.json({ error: '배송지를 수정하지 못했습니다.' }, 500);
  }
  if (!data) return c.json({ error: '존재하지 않는 배송지입니다.' }, 404); // RLS로 타인 행은 여기서 걸림
  return c.json(dto(data));
});

/* ── 삭제 ── */
deliveries.delete('/deliveries/:id', async (c) => {
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: '존재하지 않는 배송지입니다.' }, 404);

  const { data, error } = await c.get('db')
    .from('deliveries')
    .delete()
    .eq('delivery_id', id)
    .select('delivery_id');
  if (error) {
    console.error('deliveries 삭제 오류:', error);
    return c.json({ error: '배송지를 삭제하지 못했습니다.' }, 500);
  }
  if (!data?.length) return c.json({ error: '존재하지 않는 배송지입니다.' }, 404); // RLS로 타인 행도 여기
  return c.json({ success: true });
});
