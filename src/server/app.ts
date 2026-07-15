// Hono 앱 본체 — 프레임워크 독립 (Astro에는 src/pages/api/[...path].ts 마운트 파일로만 연결).
// 모든 API는 /api/v1 아래에서 서빙된다 (backend.md §1 A안 + URL 버저닝).
import { Hono } from 'hono';
import { contact } from './routes/contact';
import { quoteDownload } from './routes/quoteDownload';
import { users } from './routes/users';
import { inquiries } from './routes/inquiries';
import { cart } from './routes/cart';
import { dibs } from './routes/dibs';
import { orders } from './routes/orders';
import { payments } from './routes/payments';
import { admin } from './routes/admin';
import { cron } from './routes/cron';
import { csrfProtect } from './middleware/csrf';
import { getServiceClient } from './lib/supabase';

export const app = new Hono().basePath('/api/v1');

// CSRF 방어 — 라우트보다 먼저 실행되도록 최상단에 등록 (변경 요청의 Origin/Referer 검증)
app.use('*', csrfProtect);

// 헬스체크 — n8n 모니터링이 주기 호출 (부수 효과로 함수 인스턴스 워밍).
// DB 연결까지 확인해 장애 시 503 — 모니터링이 상태 코드만으로 판별 가능.
app.get('/health', async (c) => {
  const db = getServiceClient();
  if (!db) return c.json({ ok: false, db: false }, 503);
  const { error } = await db.from('products').select('product_sku').limit(1);
  if (error) {
    console.error('[health] DB 확인 오류:', error);
    return c.json({ ok: false, db: false }, 503);
  }
  return c.json({ ok: true, db: true });
});

app.route('/', contact);
app.route('/', quoteDownload);
app.route('/', users);
app.route('/', inquiries);
app.route('/', cart);
app.route('/', dibs);
app.route('/', orders);
app.route('/', payments);
app.route('/admin', admin);
app.route('/', cron);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  console.error('[api] unhandled error:', err);
  return c.json({ error: '서버 오류가 발생했습니다.' }, 500);
});
