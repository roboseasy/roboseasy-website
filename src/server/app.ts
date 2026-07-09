// Hono 앱 본체 — 프레임워크 독립 (Astro에는 src/pages/api/[...path].ts 마운트 파일로만 연결).
// 모든 API는 /api 아래에서 서빙된다 (backend.md §1 A안).
import { Hono } from 'hono';
import { contact } from './routes/contact';
import { quoteDownload } from './routes/quoteDownload';
import { users } from './routes/users';
import { inquiries } from './routes/inquiries';
import { admin } from './routes/admin';

export const app = new Hono().basePath('/api');

app.route('/', contact);
app.route('/', quoteDownload);
app.route('/', users);
app.route('/', inquiries);
app.route('/admin', admin);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  console.error('[api] unhandled error:', err);
  return c.json({ error: '서버 오류가 발생했습니다.' }, 500);
});
