import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { specialties } from '../../../packages/types';
import { db } from './db';
import { createApp } from './app';
import { hashToken } from './auth';
import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
const app = createApp(db), adminToken = testAdminToken(), token = testAdminToken();
const prefix = 'profile-' + randomUUID();
let accountId: string, otherId: string;
before(async () => {
  process.env.GOOGLE_APP_ACCESS = 'verified'; process.env.APP_PUBLIC_URL = 'http://localhost:8081';
  await createTestAdmin(db, adminToken);
  accountId = (await db.account.create({ data: { googleSubject: prefix, email: 'reader@example.test', name: 'Original' } })).id;
  otherId = (await db.account.create({ data: { googleSubject: prefix + '-other', email: 'other@example.test', name: 'Otra cuenta' } })).id;
  await db.authSession.create({ data: { tokenHash: hashToken(token), accountId, purpose: 'APP', expiresAt: new Date(Date.now() + 3600000) } });
});
after(async () => {
  const admin = await db.account.findUnique({ where: { googleSubject: hashToken(adminToken) } });
  await db.auditLog.deleteMany({ where: { entityId: { in: [accountId, otherId, ...(admin ? [admin.id] : [])] } } });
  await db.account.deleteMany({ where: { googleSubject: { startsWith: prefix } } });
  await removeTestAdmin(db, adminToken); await db.$disconnect();
});
test('profile editing requires a session of the right purpose', async () => {
  await request(app).patch('/api/v1/auth/me').set('Origin', 'http://localhost:8081').send({ name: 'Cambio' }).expect(401);
  await request(app).patch('/api/v1/auth/admin/me').set('Authorization', `Bearer ${token}`).send({ name: 'Cambio' }).expect(401);
  await request(app).patch('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Cambio' }).expect(401);
});
test('account identifiers, email, roles and blocking cannot be assigned', async () => {
  for (const input of [{ name: '' }, { name: ' ' }, { name: 'x'.repeat(201) }, { name: 'Nombre', id: otherId }, { name: 'Nombre', email: 'attacker@example.test' }, { name: 'Nombre', role: 'ADMIN' }, { name: 'Nombre', blocked: false }]) {
    await request(app).patch('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).send(input).expect(400);
  }
  const saved = await request(app).patch('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).send({ name: '  Nombre actualizado  ' }).expect(200);
  assert.equal(saved.body.user.name, 'Nombre actualizado'); assert.equal(saved.body.user.email, 'reader@example.test'); assert.equal(saved.body.user.role, 'USER');
  assert.equal((await db.account.findUniqueOrThrow({ where: { id: otherId } })).name, 'Otra cuenta');
  assert.ok(await db.auditLog.findFirst({ where: { action: 'ACCOUNT_PROFILE_UPDATED', actor: accountId, entityId: accountId } }));
});
test('cookie updates enforce origin checks and successful changes persist', async () => {
  for (const origin of ['', 'https://attacker.example']) await request(app).patch('/api/v1/auth/me').set('Cookie', `utn_app_session=${token}`).set('Origin', origin).send({ name: 'Forjado' }).expect(403);
  await request(app).patch('/api/v1/auth/me').set('Cookie', `utn_app_session=${token}`).set('Origin', 'http://localhost:8081').send({ name: 'Desde web' }).expect(200);
  assert.equal((await request(app).get('/api/v1/auth/me').set('Cookie', `utn_app_session=${token}`).expect(200)).body.user.name, 'Desde web');
  await request(app).patch('/api/v1/auth/admin/me').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Admin actualizado' }).expect(200);
});
test('specialty is optional, limited to the allowed choices, persists and belongs only to the signed-in account', async () => {
  const target = createApp(db), endpoint = '/api/v1/auth/me';
  assert.equal((await request(target).get(endpoint).set('Authorization', `Bearer ${token}`).expect(200)).body.user.specialty, null);
  for (const specialty of specialties) {
    const response = await request(target).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ name: 'Desde web', specialty }).expect(200);
    assert.equal(response.body.user.specialty, specialty);
    assert.equal((await db.account.findUniqueOrThrow({ where: { id: accountId } })).specialty, specialty);
  }
  await request(target).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ name: 'Nombre nuevo' }).expect(200);
  assert.equal((await request(target).get(endpoint).set('Authorization', `Bearer ${token}`).expect(200)).body.user.specialty, 'QUIMICA');
  for (const specialty of ['Arquitectura', '', 'Sistemas', 1, ['NAVAL']]) await request(target).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ name: 'Inválido', specialty }).expect(400);
  await request(target).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ name: 'Forjado', specialty: 'NAVAL', id: otherId }).expect(400);
  assert.equal((await db.account.findUniqueOrThrow({ where: { id: otherId } })).specialty, null);
  const cleared = await request(target).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ name: 'Desde web', specialty: null }).expect(200);
  assert.equal(cleared.body.user.specialty, null);
});
test('blocked, expired and revoked sessions cannot update profiles', async () => {
  await db.account.update({ where: { id: accountId }, data: { blocked: true } });
  await request(app).patch('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).send({ name: 'Bloqueado' }).expect(401);
  await db.account.update({ where: { id: accountId }, data: { blocked: false } });
  await db.authSession.update({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(0) } });
  await request(app).patch('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).send({ name: 'Vencido' }).expect(401);
  await db.authSession.delete({ where: { tokenHash: hashToken(token) } });
  await request(app).patch('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).send({ name: 'Revocado' }).expect(401);
});
