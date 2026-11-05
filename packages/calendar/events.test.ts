import assert from 'node:assert/strict';
import test from 'node:test';
import { scheduleEvents } from './events';
import type { CalendarEvent } from '@utn/api-client';
test('Schedule-X preserves instants and Argentina dates across midnight', () => {
  const event: CalendarEvent = { id: 'overnight', title: 'Jornada', description: '<texto>', location: 'Medrano', color: 'BLUE', startsAt: '2026-11-06T02:30:00Z', endsAt: '2026-11-06T04:00:00Z', status: 'PUBLISHED', createdAt: '2026-11-01T12:00:00Z', updatedAt: '2026-11-01T12:00:00Z' };
  const [mapped] = scheduleEvents([event]);
  assert.equal(mapped.start.toPlainDate().toString(), '2026-11-05');
  assert.equal(mapped.end.toPlainDate().toString(), '2026-11-06');
  assert.equal(mapped.start.toInstant().toString(), event.startsAt);
  assert.equal(mapped.calendarId, 'BLUE');
  assert.equal(mapped.description, '<texto>');
  assert.deepEqual(scheduleEvents([]), []);
});
