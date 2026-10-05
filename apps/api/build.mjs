import { build } from 'esbuild';
await build({
  entryPoints: ['src/server.ts'], outfile: 'dist/server.mjs', bundle: true,
  platform: 'node', target: 'node22', format: 'esm', external: ['pg-native'],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
