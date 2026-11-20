import { db } from '../src/db';
import { readStudyCatalog } from './study-catalog';

// Explicit command only. Stable identifiers preserve every user's progress on reimport.
try {
  const plans = readStudyCatalog();
  await db.$transaction(async tx => {
    for (const { courses, id, specialty, version, name, sourceUrl, verifiedAt, notes } of plans) {
      const plan = { id, specialty, version, name, sourceUrl, verifiedAt, notes };
      const data = { ...plan, verifiedAt: new Date(plan.verifiedAt) };
      await tx.studyPlan.upsert({ where: { id: plan.id }, create: data, update: data });
      for (const course of courses) {
        const data = { ...course, id: `${plan.id}:${course.code}`, planId: plan.id };
        await tx.studyCourse.upsert({ where: { id: data.id }, create: data, update: data });
      }
    }
  }, { timeout: 60000 });
  console.info(JSON.stringify({ plans: plans.length, courses: plans.reduce((total, plan) => total + plan.courses.length, 0), progressPreserved: true }));
} finally { await db.$disconnect(); }
