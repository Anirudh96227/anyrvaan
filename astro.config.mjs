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
  // /studio was folded into /contact — one page now covers who I am and how
  // to reach me. Kept as a redirect so old links and anything already indexed
  // still land somewhere real.
  redirects: {
    '/studio': '/contact',
  },
  integrations: [sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
    // Transformers.js ships its own onnxruntime-web WASM binaries and resolves
    // them relative to its own module URL. Vite's dependency pre-bundling
    // rewrites that URL and the runtime then looks for the .wasm files in the
    // wrong place, so the library has to be left alone.
    optimizeDeps: {
      exclude: ['@huggingface/transformers'],
    },
    // onnxruntime-node is the server-side backend. It gets pulled in by the
    // package's entry point but is useless in a browser build, and Rollup
    // fails on its .node binary if it is followed.
    ssr: {
      external: ['onnxruntime-node'],
    },
  }
});