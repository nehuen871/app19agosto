import { Router } from 'express';
import { z } from 'zod';
import { studyRequirements, studentProgressInput, studentPlanInput } from '@utn/validation';
import { readerAuth } from './reader-auth';
import type { PrismaClient } from './generated/prisma/client';
export function studentRouter(db: PrismaClient) {
  const router = Router();
  router.use(readerAuth(db));
  router.use((req, res, next) => {
    if (res.locals.sessionPurpose !== 'APP') { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Ingresá a la app para editar tu avance.', details: [] } }); return; }
    if (req.method !== 'GET' && !req.get('authorization') && req.get('origin') !== new URL(process.env.APP_PUBLIC_URL ?? 'http://localhost:8081').origin) { res.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'Origen no permitido.', details: [] } }); return; }
    next();
  });
  router.get('/', async (_req, res) => {
    const account = await db.account.findUniqueOrThrow({ where: { id: res.locals.accountId }, select: { specialty: true, studyPlanId: true } });
    const plans = account.specialty ? await db.studyPlan.findMany({ where: { specialty: account.specialty }, orderBy: { version: 'desc' } }) : [];
    const chosen = plans.find(plan => plan.id === account.studyPlanId) ?? plans[0];
    if (!chosen) { res.json({ specialty: account.specialty, plans, plan: null }); return; }
    const courses = await db.studyCourse.findMany({ where: { planId: chosen.id }, orderBy: [{ year: 'asc' }, { code: 'asc' }], include: { progress: { where: { accountId: res.locals.accountId }, select: { status: true, updatedAt: true } } } });
    res.json({ specialty: account.specialty, plans, plan: { ...chosen, courses: courses.map(({ progress, requirements, ...course }) => ({ ...course, requirements: studyRequirements.parse(requirements), status: progress[0]?.status ?? 'PENDING', updatedAt: progress[0]?.updatedAt ?? null })) } });
  });
  router.put('/plan', async (req, res) => {
    const { planId } = studentPlanInput.parse(req.body);
    const account = await db.account.findUniqueOrThrow({ where: { id: res.locals.accountId }, select: { specialty: true } });
    const plan = await db.studyPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.specialty !== account.specialty) { res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Elegí un plan de tu especialidad.', details: [] } }); return; }
    await db.account.update({ where: { id: res.locals.accountId }, data: { studyPlanId: planId } });
    res.json({ saved: true });
  });
  router.patch('/courses/:id', async (req, res) => {
    const courseId = z.string().min(1).max(180).parse(req.params.id), input = studentProgressInput.parse(req.body);
    const accountId: string = res.locals.accountId;
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${accountId}))`;
      const account = await tx.account.findUniqueOrThrow({ where: { id: accountId }, select: { specialty: true } });
      const course = await tx.studyCourse.findUnique({ where: { id: courseId }, include: { plan: { select: { specialty: true } } } });
      if (!course || course.plan.specialty !== account.specialty) return { error: 'course' } as const;
      const previous = await tx.studentProgress.findUnique({ where: { accountId_courseId: { accountId, courseId } } });
      if ((previous?.updatedAt.toISOString() ?? null) !== input.expectedUpdatedAt) return { error: 'conflict' } as const;
      const updatedAt = new Date(Math.max(Date.now(), (previous?.updatedAt.getTime() ?? 0) + 1));
      const saved = await tx.studentProgress.upsert({ where: { accountId_courseId: { accountId, courseId } }, create: { accountId, courseId, status: input.status, updatedAt }, update: { status: input.status, updatedAt } });
      return { saved };
    });
    if ('error' in result) { res.status(result.error === 'conflict' ? 409 : 404).json({ error: { code: result.error === 'conflict' ? 'PROGRESS_CONFLICT' : 'NOT_FOUND', message: result.error === 'conflict' ? 'Tu avance cambió en otro dispositivo. Actualizá y volvé a guardar.' : 'Materia no disponible para tu especialidad.', details: [] } }); return; }
    res.json(result.saved);
  });
  return router;
}
