import { z } from 'zod';
const publicOrigin = z.string().url().refine(value => {
  const url = new URL(value);
  return !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)));
});
const schema = z.object({
  GOOGLE_LOGIN_ENABLED: z.enum(['true', 'false']).default('false'),
  ADMIN_PUBLIC_URL: publicOrigin.default('http://localhost:3001'),
  GOOGLE_APP_ACCESS: z.enum(['institutional', 'verified']).default('institutional'),
  ALLOWED_EMAIL_DOMAINS: z.string().default('').refine(value => value.split(',').map(v => v.trim()).filter(Boolean).every(v => /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(v))),
  ADMIN_GOOGLE_EMAILS: z.string().default('').refine(value => value.split(',').map(v => v.trim()).filter(Boolean).every(v => z.email().safeParse(v).success)),
  GOOGLE_CLIENT_ID: z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional()),
  GOOGLE_REDIRECT_URI: z.preprocess(value => value === '' ? undefined : value, z.string().url().refine(value => { const url = new URL(value); return !url.username && !url.password && !url.search && !url.hash && url.pathname === '/api/v1/google-calendar/callback' && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))); }).optional()),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:8081').refine(value => { const url = new URL(value); return !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))); }),
  PUSH_VAPID_PUBLIC_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^[A-Za-z0-9_-]{87}$/).optional()),
  PUSH_VAPID_PRIVATE_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional()),
  PUSH_VAPID_SUBJECT: z.preprocess(value => value === '' ? undefined : value, z.string().regex(/^(mailto:|https:\/\/)/).optional()),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().refine(value => /^postgres(ql)?:/.test(value)),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  ADMIN_ACCESS_TOKEN: z.string().min(32),
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:8081').transform(value => value.split(',').map(origin => origin.trim())).pipe(z.array(z.string().url().refine(value => new URL(value).origin === value)).min(1)),
}).refine(value => value.GOOGLE_LOGIN_ENABLED !== 'true' || Boolean(value.GOOGLE_CLIENT_ID && value.GOOGLE_CLIENT_SECRET), { message: 'Configure Google login credentials', path: ['GOOGLE_LOGIN_ENABLED'] }).refine(value => [value.PUSH_VAPID_PUBLIC_KEY, value.PUSH_VAPID_PRIVATE_KEY, value.PUSH_VAPID_SUBJECT].filter(Boolean).length % 3 === 0, { message: 'Configure all VAPID settings', path: ['PUSH_VAPID_PUBLIC_KEY'] })
  .refine(value => [value.GOOGLE_CLIENT_ID, value.GOOGLE_CLIENT_SECRET, value.GOOGLE_REDIRECT_URI].filter(Boolean).length % 3 === 0, { message: 'Configure all Google OAuth settings', path: ['GOOGLE_CLIENT_ID'] })
  .refine(value => !value.GOOGLE_REDIRECT_URI || new URL(value.GOOGLE_REDIRECT_URI).origin === new URL(value.APP_PUBLIC_URL).origin, { message: 'Google callback must use app origin', path: ['GOOGLE_REDIRECT_URI'] });
export function readEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) throw new Error(`Invalid environment: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  return result.data;
}
