import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { eventInput } from '@utn/validation';
import { db } from '../src/db';

// Opt-in local test data; never invoked by deployment or the default seed.
// Only CalendarEvent is written: no notification, delivery or Google Calendar calls.
const year = 2026;
const colors = ['BLUE', 'YELLOW', 'LIGHT_BLUE', 'CYAN_GRAY'] as const;
const titles = ['Taller de programación', 'Consultas de matemática', 'Encuentro de estudiantes', 'Charla de orientación', 'Jornada de proyectos', 'Práctica de laboratorio', 'Actividad cultural', 'Taller de preparación de finales'];
const locations = ['Campus · aula de prueba', 'Medrano · espacio de prueba', 'Modalidad virtual · demostración', 'Biblioteca · sala de prueba'];
function idFor(key: string) {
  const bytes = createHash('sha1').update(`19app-demo-calendar-${year}:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const events: Array<ReturnType<typeof eventInput.parse> & { id: string }> = [];
function add(key: string, label: string, startsAt: Date, minutes: number) {
  const index = events.length;
  events.push({ id: idFor(key), ...eventInput.parse({
    title: `[PRUEBA ${year} ${String(index + 1).padStart(3, '0')}] ${label}`,
    description: 'Evento ficticio para probar el calendario. No es una actividad real ni requiere inscripción. Horarios de Argentina. Esta carga no envía notificaciones.',
    location: locations[index % locations.length],
    startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + minutes * 60000).toISOString(),
    color: colors[index % colors.length], status: 'PUBLISHED',
  }) });
}
// Argentina's local dates start at UTC 03:00.
for (let day = 0; day < 365; day++) add(`daily-${day}`, titles[day % titles.length], new Date(Date.UTC(year, 0, day + 1, [12, 15, 19, 22][day % 4])), [45, 90, 120, 180][day % 4]);
for (let month = 0; month < 12; month++) {
  for (let overlap = 0; overlap < 2; overlap++) add(`overlap-${month}-${overlap}`, `Actividades simultáneas · grupo ${overlap + 1}`, new Date(Date.UTC(year, month, 15, 18, overlap * 30)), 120);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  add(`boundary-${month}`, month % 2 ? 'Jornada de varios días entre meses' : 'Actividad que cruza medianoche y fin de mes', new Date(Date.UTC(year, month, month % 2 ? lastDay - 1 : lastDay, 25)), month % 2 ? 3 * 24 * 60 : 4 * 60);
}
for (let extra = 0; extra < 99; extra++) add(`november-${extra}`, `Agenda intensiva de noviembre · turno ${Math.floor(extra / 30) + 1}`, new Date(Date.UTC(year, 10, extra % 30 + 1, 12 + Math.floor(extra / 30) * 2)), 60);

assert.equal(events.length, 500);
assert.equal(new Set(events.map(event => event.id)).size, 500);
try {
  const ids = events.map(event => event.id);
  const result = await db.$transaction(async tx => {
    const existing = await tx.calendarEvent.count({ where: { id: { notIn: ids } } });
    const inserted = await tx.calendarEvent.createMany({ data: events.map(event => ({ ...event, startsAt: new Date(event.startsAt), endsAt: new Date(event.endsAt) })), skipDuplicates: true });
    const batch = await tx.calendarEvent.findMany({ where: { id: { in: ids } }, select: { startsAt: true, endsAt: true, color: true, status: true } });
    assert.equal(batch.length, 500);
    assert.equal(await tx.calendarEvent.count({ where: { id: { notIn: ids } } }), existing);
    const monthly = Array.from({ length: 12 }, (_, month) => {
      const from = new Date(Date.UTC(year, month, 1, 3)), to = new Date(Date.UTC(year, month + 1, 1, 3));
      return { month: `${year}-${String(month + 1).padStart(2, '0')}`, events: batch.filter(event => event.startsAt < to && event.endsAt > from).length };
    });
    assert.ok(monthly.every(month => month.events > 0));
    assert.ok(monthly[10].events > 100);
    return { created: inserted.count, batchTotal: batch.length, year, existingEventsPreserved: existing, monthly };
  }, { timeout: 60000 });
  console.info(JSON.stringify(result));
} finally { await db.$disconnect(); }
