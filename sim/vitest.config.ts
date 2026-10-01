import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['sim/**/*.test.ts'], testTimeout: 1_800_000 } });
