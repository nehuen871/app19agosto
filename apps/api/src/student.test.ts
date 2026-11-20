import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
import { hashToken } from './auth';
import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
import { readStudyCatalog, validateStudyCatalog } from '../prisma/study-catalog';
import { ruleSatisfied } from '../../../packages/types/student';

const app = createApp(db), prefix = 'student-' + randomUUID(), token = testAdminToken(), otherToken = testAdminToken(), adminToken = testAdminToken();
let accountId: string, otherId: string;
const planId = prefix, courseId = `${prefix}:1`, dependentId = `${prefix}:2`, wrongId = `${prefix}-other:1`;
const empty = { regular: [], approved: [], notes: [] }, requirements = { enroll: empty, exam: empty };
before(async () => {
  process.env.GOOGLE_APP_ACCESS = 'verified'; process.env.APP_PUBLIC_URL = 'http://localhost:8081';
  await createTestAdmin(db, adminToken);
  for (const [id, specialty] of [[planId, 'SISTEMAS'], [prefix + '-other', 'NAVAL']] as const) await db.studyPlan.create({ data: { id, specialty, version: prefix, name: 'Prueba aislada', sourceUrl: 'https://frba.utn.edu.ar', verifiedAt: new Date(), notes: '' } });
  for (const [id, plan, code] of [[courseId, planId, '1'], [dependentId, planId, '2'], [wrongId, prefix + '-other', '1']]) await db.studyCourse.create({ data: { id, planId: plan, code, name: 'Materia de prueba', year: 1, requirements, notes: '' } });
  accountId = (await db.account.create({ data: { googleSubject: prefix, email: 'student@example.test', name: 'Estudiante A', specialty: 'SISTEMAS', studyPlanId: planId } })).id;
  otherId = (await db.account.create({ data: { googleSubject: prefix + '-other', email: 'other-student@example.test', name: 'Estudiante B', specialty: 'SISTEMAS', studyPlanId: planId } })).id;
  for (const [t, id] of [[token, accountId], [otherToken, otherId]]) await db.authSession.create({ data: { tokenHash: hashToken(t), accountId: id, purpose: 'APP', expiresAt: new Date(Date.now() + 3600000) } });
});
after(async () => {
  await db.account.deleteMany({ where: { googleSubject: { startsWith: prefix } } });
  await db.studyCourse.deleteMany({ where: { planId: { startsWith: prefix } } });
  await db.studyPlan.deleteMany({ where: { id: { startsWith: prefix } } });
  await removeTestAdmin(db, adminToken); await db.$disconnect();
});
function get(t = token) { return request(app).get('/api/v1/student').set('Authorization', `Bearer ${t}`); }
function save(body: object, id = courseId, t = token) { return request(app).patch(`/api/v1/student/courses/${encodeURIComponent(id)}`).set('Authorization', `Bearer ${t}`).send(body); }
test('official catalog has nine complete plans, valid references and no enrollment cycles', () => {
  const catalog = readStudyCatalog();
  assert.equal(catalog.length, 9); assert.equal(catalog.reduce((n, p) => n + p.courses.length, 0), 429);
  const invalid = structuredClone(catalog); invalid[0].courses[0].requirements.enroll.regular = ['missing'];
  assert.throws(() => validateStudyCatalog(invalid));
  const systems = catalog.find(p => p.specialty === 'SISTEMAS')!;
  assert.deepEqual(systems.courses.find(c => c.code === '36')!.requirements.enroll.regular, ['25', '26', '30']);
  assert.ok(systems.courses.find(c => c.code === '36')!.requirements.exam.approved.includes('35'));
  const chemistry = catalog.find(p => p.specialty === 'QUIMICA')!;
  assert.deepEqual(chemistry.courses.find(c => c.code === '231143')!.requirements.enroll.approved, ['950702', '231120']);
});
test('missing and admin sessions cannot read or edit student data; cookie mutations reject foreign origins', async () => {
  await request(app).get('/api/v1/student').expect(401); await get(adminToken).expect(401);
  await save({ status: 'APPROVED', expectedUpdatedAt: null }, courseId, adminToken).expect(401);
  for (const origin of ['', 'https://attacker.example']) await request(app).patch(`/api/v1/student/courses/${encodeURIComponent(courseId)}`).set('Cookie', `utn_app_session=${token}`).set('Origin', origin).send({ status: 'APPROVED', expectedUpdatedAt: null }).expect(403);
});
test('strict inputs and specialty checks prevent mass assignment and cross-plan writes', async () => {
  for (const input of [{ status: 'ADMIN', expectedUpdatedAt: null }, { status: 'APPROVED', expectedUpdatedAt: null, accountId: otherId }, { status: 'APPROVED' }, { status: 'REGULAR', expectedUpdatedAt: 'invalid' }]) await save(input).expect(400);
  await save({ status: 'APPROVED', expectedUpdatedAt: null }, wrongId).expect(404);
  await request(app).put('/api/v1/student/plan').set('Authorization', `Bearer ${token}`).send({ planId: prefix + '-other' }).expect(400);
  await request(app).put('/api/v1/student/plan').set('Authorization', `Bearer ${token}`).send({ planId, accountId: otherId }).expect(400);
});
test('progress persists for its owner, remains private and concurrent stale writes conflict', async () => {
  const responses = await Promise.all([save({ status: 'REGULAR', expectedUpdatedAt: null }), save({ status: 'APPROVED', expectedUpdatedAt: null })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const saved = responses.find(r => r.status === 200)!.body;
  const own = await get().expect(200), other = await get(otherToken).expect(200);
  assert.match(own.headers['cache-control'], /private.*no-store/);
  assert.equal(own.body.plan.courses.find((c: { id: string }) => c.id === courseId).status, saved.status);
  assert.equal(other.body.plan.courses.find((c: { id: string }) => c.id === courseId).status, 'PENDING');
  assert.equal(await db.studentProgress.count({ where: { accountId: otherId } }), 0);
  const corrected = await save({ status: 'PENDING', expectedUpdatedAt: saved.updatedAt }).expect(200);
  assert.notEqual(corrected.body.updatedAt, saved.updatedAt);
  await save({ status: 'TAKING', expectedUpdatedAt: saved.updatedAt }).expect(409);
  await request(app).patch(`/api/v1/student/courses/${encodeURIComponent(dependentId)}`).set('Cookie', `utn_app_session=${token}`).set('Origin', 'http://localhost:8081').send({ status: 'APPROVED', expectedUpdatedAt: null }).expect(200);
  assert.equal((await db.studentProgress.findUniqueOrThrow({ where: { accountId_courseId: { accountId, courseId: dependentId } } })).status, 'APPROVED');
});
test('changing specialty hides the old plan, and returning recovers the saved path', async () => {
  await db.account.update({ where: { id: accountId }, data: { specialty: null } });
  assert.equal((await get().expect(200)).body.plan, null);
  await save({ status: 'APPROVED', expectedUpdatedAt: null }, dependentId).expect(404);
  await db.account.update({ where: { id: accountId }, data: { specialty: 'SISTEMAS' } });
  assert.equal((await get().expect(200)).body.plan.courses.find((c: { id: string }) => c.id === dependentId).status, 'APPROVED');
});
test('reversing a prerequisite relocks dependents; regularized differs from approved and manual conditions stay explicit', () => {
  const rule = { regular: ['1'], approved: ['2'], notes: [] };
  assert.equal(ruleSatisfied(rule, { '1': 'REGULAR', '2': 'APPROVED' }), true);
  assert.equal(ruleSatisfied(rule, { '1': 'TAKING', '2': 'APPROVED' }), false);
  assert.equal(ruleSatisfied(rule, { '1': 'APPROVED', '2': 'REGULAR' }), false);
  assert.equal(ruleSatisfied({ regular: [], approved: [], notes: ['Verificar práctica'] }, {}), false);
});
test('blocked, expired and revoked app sessions cannot access progress', async () => {
  await db.account.update({ where: { id: accountId }, data: { blocked: true } }); await get().expect(401);
  await db.account.update({ where: { id: accountId }, data: { blocked: false } });
  await db.authSession.update({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(0) } }); await get().expect(401);
  await db.authSession.delete({ where: { tokenHash: hashToken(token) } }); await get().expect(401);
});

