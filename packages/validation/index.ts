import { z } from 'zod';
import { specialties } from '@utn/types';
import { studyStatuses } from '@utn/types';
const studyRule = z.object({ regular: z.array(z.string().min(1)).max(300), approved: z.array(z.string().min(1)).max(300), notes: z.array(z.string().max(2000)).max(20) }).strict();
export const studyRequirements = z.object({ enroll: studyRule, exam: studyRule }).strict();
export const studentProgressInput = z.object({ status: z.enum(studyStatuses), expectedUpdatedAt: z.iso.datetime().nullable() }).strict();
export const studentPlanInput = z.object({ planId: z.string().regex(/^[a-z0-9-]+$/).max(100) }).strict();
import { decodeRich, encodeRich, richPlain, richPrefix, richLimit, richStorageLimit, richContentLimit, richContentStorageLimit } from '@utn/types';
function newsRichField(label: string, limit: number, storageLimit: number) { return z.string().max(storageLimit).superRefine((value, context) => {
  const doc = decodeRich(value);
  if (!doc) { context.addIssue({ code: 'custom', message: `El formato de ${label} no es válido.` }); return; }
  const text = richPlain(doc);
  if (!text.trim() || text.length > limit) context.addIssue({ code: 'custom', message: `${label} debe tener entre 1 y ${limit} caracteres de texto.` });
}).transform(value => value.startsWith(richPrefix) ? encodeRich(decodeRich(value)!) : value.trim()); }
export const newsSummary = newsRichField('Resumen', richLimit, richStorageLimit);
export const newsContent = newsRichField('Contenido', richContentLimit, richContentStorageLimit);
export const newsQuery = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), category: z.string().trim().min(1).max(100).optional(), featured: z.enum(['true','false']).optional().transform(v => v === undefined ? undefined : v === 'true') });
export const slugParam = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160);
export const categoryInput = z.object({ name: z.string().trim().min(1).max(100).refine(value => /[a-z0-9]/i.test(value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))), parentId: z.cuid().nullable().optional() }).strict();

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
  summary: newsSummary,
  content: newsContent,
  category: slugParam.max(100), // Slug of an existing category; news writes never create categories.
  coverImageUrl: z.string().url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol)).nullable().optional(),
  coverImageId: z.uuid().nullable().optional(),
  featured: z.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
}).strict();

export const newsUpdateInput = newsInput.extend({ status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) });

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

export const accountProfileInput = z.object({ name: z.string().trim().min(1, 'Ingresá tu nombre.').max(200, 'El nombre admite hasta 200 caracteres.'), specialty: z.enum(specialties).nullable().optional() }).strict();
