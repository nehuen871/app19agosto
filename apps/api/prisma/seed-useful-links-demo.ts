import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { usefulLinkInput } from '@utn/validation';
import { validImage, imageLimit } from '../src/media';
import { db } from '../src/db';

// Explicit demo command only. Assets are bundled; importing never visits links,
// joins groups, submits forms, creates accounts or sends notifications.
const fixture = z.array(z.object({
  key: z.string().regex(/^[a-z0-9-]+$/), title: z.string(), description: z.string(),
  url: z.string(), priority: z.number(), featured: z.boolean(),
}).strict()).length(16);
function idFor(value: string) {
  const bytes = createHash('sha256').update('19app-demo-useful-links-v1:' + value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
try {
  const links = fixture.parse(JSON.parse(readFileSync(new URL('./demo-links/links.json', import.meta.url), 'utf8')));
  assert.equal(new Set(links.map(link => link.key)).size, 16);
  assert.equal(new Set(links.map(link => link.url)).size, 16);
  const prepared = links.map(link => {
    const image = readFileSync(new URL(`./demo-links/images/${link.key}.png`, import.meta.url));
    assert.ok(image.length <= imageLimit && validImage(image, 'image/png'), `Imagen inválida: ${link.key}`);
    const input = usefulLinkInput.parse({ title: link.title, description: link.description + ' Carga de prueba.', url: link.url, imageId: idFor('image:' + link.key), priority: link.priority, featured: link.featured, published: true });
    return { id: idFor(link.key), image, input };
  });
  const result = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2026112016)`;
    const before = await tx.usefulLink.count();
    let created = 0, skipped = 0;
    for (const item of prepared) {
      // Preserve edits and logical deletions, including records with the same
      // destination created from the admin using another ID.
      if (await tx.usefulLink.findFirst({ where: { OR: [{ id: item.id }, { url: item.input.url }] }, select: { id: true } })) { skipped++; continue; }
      await tx.mediaImage.upsert({ where: { id: item.input.imageId }, create: { id: item.input.imageId, mimeType: 'image/png', data: item.image, byteSize: item.image.length }, update: {} });
      await tx.usefulLink.create({ data: { id: item.id, ...item.input } });
      created++;
    }
    assert.equal(await tx.usefulLink.count(), before + created);
    return { created, skipped, fixtureTotal: prepared.length, featuredInFixture: prepared.filter(item => item.input.featured).length, existingLinksPreserved: before };
  }, { timeout: 60000 });
  console.info(JSON.stringify(result));
} finally { await db.$disconnect(); }
