import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { studyRequirements } from '@utn/validation';

const entry = z.object({
  id: z.string().regex(/^frba-[a-z0-9-]+$/), specialty: z.enum(['NAVAL', 'CIVIL', 'TEXTIL', 'SISTEMAS', 'MECANICA', 'INDUSTRIAL', 'ELECTRONICA', 'ELECTRICA', 'QUIMICA']),
  version: z.string().min(1), name: z.string().min(1), sourceUrl: z.url().refine(url => new URL(url).hostname.replace(/^www\./, '') === 'frba.utn.edu.ar'),
  verifiedAt: z.iso.datetime(), sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), notes: z.string(),
  courses: z.array(z.object({ code: z.string().min(1).max(100), name: z.string().min(1), year: z.number().int().min(0).max(6), kind: z.enum(['SUBJECT', 'ELECTIVE', 'PRACTICE', 'OPTIONAL']), notes: z.string(), requirements: studyRequirements })).min(30).max(100),
});
export function validateStudyCatalog(value: unknown) {
  const plans = z.array(entry).length(9).parse(value);
  if (new Set(plans.map(p => p.specialty)).size !== 9) throw new Error('El catálogo debe incluir las nueve especialidades.');
  for (const plan of plans) {
    const codes = new Set(plan.courses.map(c => c.code));
    if (codes.size !== plan.courses.length) throw new Error(`Códigos duplicados en ${plan.id}`);
    for (const course of plan.courses) for (const rule of Object.values(course.requirements)) {
      for (const code of [...rule.regular, ...rule.approved]) if (!codes.has(code) || code === course.code) throw new Error(`Correlativa inválida: ${plan.id}/${course.code}/${code}`);
    }
    const visited = new Set<string>(), active = new Set<string>();
    function visit(code: string) {
      if (active.has(code)) throw new Error(`Ciclo de correlativas: ${plan.id}/${code}`);
      if (visited.has(code)) return;
      active.add(code);
      const rule = plan.courses.find(c => c.code === code)!.requirements.enroll;
      for (const dependency of [...rule.regular, ...rule.approved]) visit(dependency);
      active.delete(code); visited.add(code);
    }
    for (const code of codes) visit(code);
  }
  return plans;
}
export function readStudyCatalog() {
  return validateStudyCatalog(JSON.parse(readFileSync(new URL('./study-plans/catalog.json', import.meta.url), 'utf8')));
}
