// Hono 마운트 파일 — /api/* 전체를 src/server/app.ts로 위임 (backend.md §1 A안).
// 라우팅·핸들러 로직은 이 파일이 아니라 src/server/에 작성할 것.
export const prerender = false;

import type { APIRoute } from 'astro';
import { app } from '../../server/app';

const handler: APIRoute = ({ request }) => app.fetch(request);

export const ALL = handler;
