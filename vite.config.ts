import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * Replaces %VITE_APP_URL% in index.html with the configured public URL so the
 * Open Graph / Twitter image tags become absolute (required by some crawlers).
 * Falls back to an empty string -> relative URLs when the var is not set, so a
 * missing value never leaves a literal "%VITE_APP_URL%" in the output.
 */
const htmlAppUrl = (): Plugin => {
  // Trim trailing slash so we don't emit double slashes in the URLs.
  const appUrl = (process.env.VITE_APP_URL || '').replace(/\/$/, '');
  return {
    name: 'html-app-url',
    transformIndexHtml(html) {
      const replaced = html.replaceAll('%VITE_APP_URL%', appUrl);
      // Collapse any accidental double slashes in URLs (but keep "https://").
      return replaced.replace(/(content=")([^"]+)(")/g, (_m, a, url, c) =>
        a + url.replace(/([^:])\/{2,}/g, '$1/') + c
      );
    },
  };
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), htmlAppUrl()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
