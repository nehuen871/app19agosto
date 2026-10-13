import express, { Router } from 'express';
import { z } from 'zod';
import { adminAuth } from './admin-auth';
import type { PrismaClient } from './generated/prisma/client';
export const imageLimit = 5 * 1024 * 1024;

// Validate raster signatures, complete container endings and bounded dimensions.
// Files are served with fixed MIME + nosniff; SVG and user filenames are never used.
export function validImage(bytes: Buffer, mime: string) {
  let width = 0, height = 0;
  if (mime === 'image/png') {
    if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR' || !bytes.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))) return false;
    width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
  } else if (mime === 'image/jpeg') {
    if (bytes.length < 12 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) return false;
    let offset = 2, scan = false;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) return false;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda) { scan = offset + 4 < bytes.length - 2; break; }
      if (marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return false;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return false;
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8) return false;
        height = bytes.readUInt16BE(offset + 3); width = bytes.readUInt16BE(offset + 5);
      }
      offset += length;
    }
    if (!scan) return false;
  } else return false;
  return width > 0 && height > 0 && width <= 4096 && height <= 4096 && width * height <= 12000000;
}
export function mediaRouter(db: PrismaClient, token: string | undefined) {
  const router = Router();
  router.post('/admin/media', adminAuth(token, db), (req, res, next) => {
    if (!req.is(['image/png', 'image/jpeg'])) { res.status(415).json({ error: { code: 'IMAGE_TYPE', message: 'Elegí una imagen PNG o JPEG.', details: [] } }); return; }
    next();
  }, express.raw({ type: ['image/png', 'image/jpeg'], limit: imageLimit }), async (req, res) => {
    const mimeType = req.is('image/png') ? 'image/png' : 'image/jpeg';
    if (!Buffer.isBuffer(req.body) || !validImage(req.body, mimeType)) { res.status(400).json({ error: { code: 'INVALID_IMAGE', message: 'La imagen es inválida o supera 4096 px / 12 megapíxeles.', details: [] } }); return; }
    const image = await db.$transaction(async tx => {
      const item = await tx.mediaImage.create({ data: { mimeType, data: req.body, byteSize: req.body.length }, select: { id: true } });
      await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'IMAGE_UPLOADED', entityId: item.id } });
      return item;
    });
    res.status(201).json({ id: image.id, url: `/api/v1/media/${image.id}` });
  });
  router.get('/media/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const image = await db.mediaImage.findUnique({ where: { id } });
    if (!image) { res.sendStatus(404); return; }
    res.set({ 'Content-Type': image.mimeType, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' }).send(Buffer.from(image.data));
  });
  return router;
}
