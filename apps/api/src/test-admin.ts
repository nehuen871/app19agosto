import { randomBytes } from 'node:crypto';
import type { PrismaClient } from './generated/prisma/client';
import { hashToken } from './auth';
export const testAdminToken = () => 'utn_s_' + randomBytes(32).toString('base64url');
export async function createTestAdmin(db: PrismaClient, token: string) {
  const email = 'admin@example.test';
  process.env.ADMIN_GOOGLE_EMAILS = email;
  const account = await db.account.create({ data: { googleSubject: hashToken(token), email, name: 'Test admin', role: 'ADMIN' } });
  await db.authSession.create({ data: { tokenHash: hashToken(token), accountId: account.id, purpose: 'ADMIN', expiresAt: new Date(Date.now() + 3600000) } });
  return account.id;
}
export async function removeTestAdmin(db: PrismaClient, token: string) {
  await db.account.deleteMany({ where: { googleSubject: hashToken(token) } });
}
