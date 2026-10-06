import { z } from 'zod';
const schema = z.object({
  PUSH_VAPID_PUBLIC_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^[A-Za-z0-9_-]{87}$/).optional()),
  PUSH_VAPID_PRIVATE_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional()),
  PUSH_VAPID_SUBJECT: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^(mailto:|https:\/\/)/).optional()),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().refine(value => /^postgres(ql)?:/.test(value)),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  ADMIN_ACCESS_TOKEN: z.string().min(32),
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:8081').transform(value => value.split(',').map(origin => origin.trim())).pipe(z.array(z.string().url().refine(value => new URL(value).origin === value)).min(1)),
}).refine(value => [value.PUSH_VAPID_PUBLIC_KEY, value.PUSH_VAPID_PRIVATE_KEY, value.PUSH_VAPID_SUBJECT].filter(Boolean).length % 3 === 0, { message: 'Configure all VAPID settings', path: ['PUSH_VAPID_PUBLIC_KEY'] });
export function readEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) throw new Error(`Invalid environment: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  return result.data;
}
