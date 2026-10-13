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
  coverImageId: z.uuid().nullable().optional(),
  featured: z.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
}).strict();

export const eventInput = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).default(''),
  location: z.string().trim().max(300).default(''),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  color: z.enum(['BLUE', 'YELLOW', 'LIGHT_BLUE', 'CYAN_GRAY']).default('BLUE'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).default('DRAFT'),
}).strict().refine(value => new Date(value.endsAt) > new Date(value.startsAt), { path: ['endsAt'], message: 'El fin debe ser posterior al inicio.' });
export const eventQuery = z.object({
  month: z.string().regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});
