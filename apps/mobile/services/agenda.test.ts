import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaWeek, shiftAgendaDay } from './agenda';

test('agenda weeks run Monday to Sunday across month and year boundaries', () => {
  assert.deepEqual(agendaWeek('2026-11-01'), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  assert.deepEqual(agendaWeek('2027-01-01'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  assert.equal(agendaWeek('2026-11-16')[0], '2026-11-16');
});
test('day shifts preserve civil dates across leap days and DST changes', () => {
  assert.equal(shiftAgendaDay('2028-02-28', 1), '2028-02-29');
  assert.equal(shiftAgendaDay('2026-03-08', 7), '2026-03-15');
  assert.equal(shiftAgendaDay('2026-11-01', -7), '2026-10-25');
});
