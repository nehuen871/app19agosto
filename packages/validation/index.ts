import { z } from 'zod';
export const newsQuery = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), category: z.string().trim().min(1).max(100).optional(), featured: z.enum(['true','false']).optional().transform(v => v === undefined ? undefined : v === 'true') });
export const slugParam = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160);
