import type { CalendarEvent } from '@utn/types';
export const calendarTimeZone = 'America/Argentina/Buenos_Aires';
export function calendarDate(date: Date | string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: calendarTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(typeof date === 'string' ? new Date(date) : date);
}
export function calendarDateTime(date: string) {
  return calendarDate(date) + 'T' + new Intl.DateTimeFormat('en-GB', { timeZone: calendarTimeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(date));
}
export function calendarMonthShift(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function calendarDays(month: string): (string | null)[] {
  const [year, number] = month.split('-').map(Number);
  const leading = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => index < leading || index >= leading + count ? null : `${month}-${String(index - leading + 1).padStart(2, '0')}`);
}
export function eventOnDay(event: CalendarEvent, day: string) {
  const start = new Date(`${day}T00:00:00-03:00`).getTime();
  return new Date(event.startsAt).getTime() < start + 86400000 && new Date(event.endsAt).getTime() > start;
}
export function googleCalendarUrl(event: CalendarEvent) {
  const stamp = (date: string) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = new URL('https://calendar.google.com/calendar/render');
  url.search = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${stamp(event.startsAt)}/${stamp(event.endsAt)}`, details: event.description, location: event.location, ctz: calendarTimeZone }).toString();
  return url.href;
}
