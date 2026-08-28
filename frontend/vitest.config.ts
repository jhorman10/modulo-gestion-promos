import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.e2e.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/.eslintrc.*',
        '**/*.config.*',
      ],
      thresholds: {
        lines: 85,
        functions: 75,
        branches: 80,
        statements: 85,
      },
    },
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
