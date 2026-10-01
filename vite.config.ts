import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build num arquivo só: dá pra publicar como link e depois embrulhar no Capacitor.
export default defineConfig({
  plugins: [viteSingleFile()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  // O simulador (sim/) é lento e só roda com `npm run sim`.
  test: { include: ['test/**/*.test.ts'] },
});
