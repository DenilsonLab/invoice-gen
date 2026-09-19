import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Backend logic under test runs in Node (libSQL client, zod, express types).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
