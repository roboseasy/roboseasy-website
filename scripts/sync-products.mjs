// products 동기화 (JSON → DB upsert) — backend.md §2
// 원본(SoT)은 src/data/products.json(Sveltia CMS), DB products는 주문 FK·서버 금액 검증용 미러.
// 실행: Netlify production 빌드에서 자동(netlify.toml), 로컬은 `npm run sync-products`(.env → 테스트 DB).
// 규칙: is_active = price>0 AND !comingSoon AND JSON에 존재 / 중복·형식 오류 id는 빌드 실패 /
//       JSON에서 빠진 sku는 is_active=false (주문 이력 FK 때문에 delete 불가).
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Netlify 빌드 가드 — develop 브랜치·Deploy Preview 빌드가 prod DB를 덮어쓰지 않도록
// production 컨텍스트에서만 실행 (로컬 실행은 NETLIFY 미설정이라 통과)
if (process.env.NETLIFY === 'true' && process.env.CONTEXT !== 'production') {
  console.log(`[sync-products] CONTEXT=${process.env.CONTEXT} — production 빌드가 아니므로 스킵`);
  process.exit(0);
}

// 로컬 실행용 .env 로드 — 이미 설정된 환경변수가 우선
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  // 인프라·가용성 문제(카탈로그 오류 아님) — 콘텐츠 배포까지 막지 않도록 스킵(exit 0).
  // DB 미러는 다음 정상 배포에서 재동기화된다(upsert 멱등).
  console.warn('[sync-products] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정 — 동기화 건너뜀(배포는 계속)');
  process.exit(0);
}

const jsonPath = new URL('../src/data/products.json', import.meta.url);
const { products } = JSON.parse(readFileSync(jsonPath, 'utf8'));

/* ── 검증 — 실패 시 exit 1 = 빌드 실패 (잘못된 카탈로그로 판매 진행 방지) ── */
const errors = [];
const seen = new Set();
for (const p of products) {
  if (typeof p.id !== 'string' || !/^[a-z0-9-]{1,50}$/.test(p.id)) {
    errors.push(`잘못된 id 형식: ${JSON.stringify(p.id)} (^[a-z0-9-]{1,50}$)`);
    continue;
  }
  if (seen.has(p.id)) errors.push(`중복 id: ${p.id}`);
  seen.add(p.id);
  if (typeof p.name !== 'string' || !p.name.trim()) errors.push(`${p.id}: name 누락`);
  if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0) {
    errors.push(`${p.id}: price가 0 이상의 숫자가 아님 (${JSON.stringify(p.price)})`);
  }
}
if (errors.length) {
  for (const e of errors) console.error(`[sync-products] ${e}`);
  process.exit(1);
}

/* ── upsert + 빠진 sku 비활성화 ── */
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws }, // Node 20에 내장 WebSocket 없음 — 생성자가 요구 (src/server/lib/supabase.ts 참고)
});

const rows = products.map((p) => ({
  product_sku: p.id,
  product_name: p.name.trim(),
  category: p.category?.trim() || null,
  product_price: p.price,
  description: p.summary?.trim() || null,
  is_active: p.price > 0 && p.comingSoon !== true,
}));

const { error: upsertError } = await db.from('products').upsert(rows, { onConflict: 'product_sku' });
if (upsertError) {
  // DB 가용성 문제 — 카탈로그 검증은 이미 통과했으므로 배포는 계속하고 동기화만 건너뛴다.
  console.warn('[sync-products] upsert 실패 — 동기화 건너뜀(배포는 계속):', upsertError.message);
  process.exit(0);
}

// JSON에서 빠진 sku → is_active=false (id 형식이 ^[a-z0-9-]+$라 in-list 조합 안전)
const inList = `(${rows.map((r) => `"${r.product_sku}"`).join(',')})`;
const { data: removed, error: deactivateError } = await db
  .from('products')
  .update({ is_active: false })
  .not('product_sku', 'in', inList)
  .eq('is_active', true)
  .select('product_sku');
if (deactivateError) {
  // DB 가용성 문제 — 배포는 계속하고 동기화만 건너뛴다(다음 배포에서 재시도).
  console.warn('[sync-products] 비활성화 실패 — 동기화 건너뜀(배포는 계속):', deactivateError.message);
  process.exit(0);
}

const active = rows.filter((r) => r.is_active).length;
console.log(
  `[sync-products] 완료 — upsert ${rows.length}건 (판매 가능 ${active}건)` +
    (removed?.length ? `, JSON에서 빠진 ${removed.length}건 비활성화: ${removed.map((r) => r.product_sku).join(', ')}` : '')
);
