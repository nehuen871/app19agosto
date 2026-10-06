import { z } from 'zod';
export const newsQuery = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), category: z.string().trim().min(1).max(100).optional(), featured: z.enum(['true','false']).optional().transform(v => v === undefined ? undefined : v === 'true') });
export const slugParam = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160);

export const notificationDraft = z.object({
  title: z.string().trim().min(1, 'Ingresá un título.').max(100, 'El título admite hasta 100 caracteres.'),
  body: z.string().trim().min(1, 'Ingresá el mensaje.').max(500, 'El mensaje admite hasta 500 caracteres.'),
  newsId: z.string().trim().min(1).max(100).nullable().optional(),
}).strict();
export const notificationQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const newsInput = z.object({
  title: z.string().trim().min(1).max(160),
  slug: slugParam,
  summary: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1).max(20000),
  category: z.string().trim().min(1).max(100).refine(value => /[a-z0-9]/i.test(value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))),
  coverImageUrl: z.string().url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol)).nullable().optional(),
  featured: z.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
}).strict();
