import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('packages/brand-assets/manifest.json', root), 'utf8'));
const destination = new URL('apps/admin/public/brand/', root);
mkdirSync(destination, { recursive: true });
for (const asset of Object.values(manifest.assets)) {
  const source = new URL(asset.path, root);
  const contents = readFileSync(source);
  if (createHash('sha256').update(contents).digest('hex') !== asset.sha256) {
    throw new Error(`Brand asset differs from supplied brandbook: ${asset.path}`);
  }
  copyFileSync(source, new URL(asset.path.split('/').at(-1), destination));
}
console.info(`Official brand assets synchronized to ${fileURLToPath(destination)}`);
