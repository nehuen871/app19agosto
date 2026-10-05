import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().refine(value => /^postgres(ql)?:/.test(value)),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  ADMIN_ACCESS_TOKEN: z.string().min(32),
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:8081').transform(value => value.split(',').map(origin => origin.trim())).pipe(z.array(z.string().url().refine(value => new URL(value).origin === value)).min(1)),
});
export function readEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) throw new Error(`Invalid environment: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  return result.data;
}
