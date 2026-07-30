// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import icon from 'astro-icon';

// 부품·액세서리(category='addon')는 카탈로그에 노출하지 않는 제품 — 검색 결과에도 뜨지 않도록
// sitemap에서 뺀다. 페이지 자체는 남아 단독 구매 링크로는 동작한다(상세 페이지는 noindex).
const { products } = JSON.parse(readFileSync(new URL('./src/data/products.json', import.meta.url), 'utf8'));
const addonPaths = new Set(products.filter((p) => p.category === 'addon').map((p) => `/products/${p.id}/`));

export default defineConfig({
  site: 'https://roboseasy.ai',
  output: 'hybrid',
  adapter: netlify(),
  integrations: [sitemap({ filter: (page) => !addonPaths.has(new URL(page).pathname) }), icon()],
});
