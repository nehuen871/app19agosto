/** Civil dates use UTC arithmetic so device time zones and DST cannot shift days. */
export function shiftAgendaDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function agendaWeek(anchor: string) {
  const weekday = new Date(`${anchor}T12:00:00Z`).getUTCDay();
  const monday = shiftAgendaDay(anchor, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => shiftAgendaDay(monday, index));
}
