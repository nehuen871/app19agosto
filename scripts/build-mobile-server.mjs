import { build } from 'esbuild';
await build({ entryPoints: ['scripts/mobile-server.mjs'], outfile: 'mobile-server.mjs', bundle: true, platform: 'node', target: 'node22', format: 'esm', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
