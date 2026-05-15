// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://roboseasy.netlify.app',
  output: 'hybrid',
  adapter: netlify(),
  integrations: [sitemap()],
  redirects: {
    '/hackathon': '/hackathon-2026',
  },
});
