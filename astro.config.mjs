// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import icon from 'astro-icon';
import remarkGfm from 'remark-gfm';
import rehypeDocs from './src/lib/rehype-docs.mjs';

// 부품·액세서리(category='addon')는 카탈로그에 노출하지 않는 제품 — 검색 결과에도 뜨지 않도록
// sitemap에서 뺀다. 페이지 자체는 남아 단독 구매 링크로는 동작한다(상세 페이지는 noindex).
const { products } = JSON.parse(readFileSync(new URL('./src/data/products.json', import.meta.url), 'utf8'));
const addonPaths = new Set(products.filter((p) => p.category === 'addon').map((p) => `/products/${p.id}/`));

export default defineConfig({
  site: 'https://roboseasy.ai',
  output: 'hybrid',
  adapter: netlify(),
  markdown: {
    // 단일 물결표 취소선 끄기 — 한국어 문서의 범위 표기 '30~60초, 2~3분' 두 개가 한 문단에 있으면
    // 그 사이가 취소선이 된다. GFM 기본값 대신 singleTilde: false 로 직접 등록 (~~이중~~ 취소선은 유지)
    gfm: false,
    remarkPlugins: [[remarkGfm, { singleTilde: false }]],
    // github-dark 의 주석색(#6A737D)은 배경 대비 3:1 이라 한국어 주석이 잘 안 보인다 → default 변형(6:1)
    shikiConfig: { theme: 'github-dark-default' },
    // 문서(src/content/docs) 콜아웃·표·코드 블록 렌더링 보정 — src/lib/rehype-docs.mjs
    rehypePlugins: [rehypeDocs],
  },
  integrations: [sitemap({ filter: (page) => !addonPaths.has(new URL(page).pathname) }), icon()],
});
