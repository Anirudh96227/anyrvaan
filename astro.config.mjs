// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

// Placeholder production domain — update once real hosting/DNS is set up.
// Sitemap and canonical/OG URLs are generated from this.
const SITE_URL = 'https://anyrvaan.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap(), react()],
  vite: {
    plugins: [tailwindcss()]
  }
});