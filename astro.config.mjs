// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://roboseasy.netlify.app',
  redirects: {
    // 별칭 — 메인 홈에서 /hackathon으로 링크되어 있음
    '/hackathon': '/hackathon-2026',
  },
});
