import { Temporal } from 'temporal-polyfill';
import { calendarTimeZone, type CalendarEvent } from '@utn/api-client';
export function scheduleEvents(events: CalendarEvent[]) {
  return events.map(event => ({
    id: event.id, title: event.title, description: event.description, location: event.location,
    calendarId: event.color,
    start: Temporal.Instant.from(event.startsAt).toZonedDateTimeISO(calendarTimeZone),
    end: Temporal.Instant.from(event.endsAt).toZonedDateTimeISO(calendarTimeZone),
  }));
}
