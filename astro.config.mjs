// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://roboseasy.ai',
  output: 'hybrid',
  adapter: netlify(),
  integrations: [sitemap(), icon()],
  redirects: {
    '/hackathon': '/hackathon-2026',
  },
});
