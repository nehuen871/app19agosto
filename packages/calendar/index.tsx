'use client';
import 'temporal-polyfill/global';
import { Temporal } from 'temporal-polyfill';
import { useEffect, useRef, useState } from 'react';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';
import { createViewMonthGrid, createViewMonthAgenda } from '@schedule-x/calendar';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import { calendarTimeZone, type CalendarEvent } from '@utn/api-client';
import { scheduleEvents } from './events';
import { calendarColors } from '@utn/design-tokens';
import '@schedule-x/theme-default/dist/index.css';
import './style.css';

export type CalendarProps = {
  month: string;
  events: CalendarEvent[];
  onSelectDate?: (date: string) => void;
  onSelectEvent?: (id: string) => void;
};
const EmptyHeader = () => null;
/** Month navigation belongs to the host so pagination and API state stay synchronized. */
export function EventCalendar({ month, events, onSelectDate, onSelectEvent }: CalendarProps) {
  const callbacks = useRef({ onSelectDate, onSelectEvent });
  callbacks.current = { onSelectDate, onSelectEvent };
  const [service] = useState(() => createEventsServicePlugin());
  const calendar = useCalendarApp({
    locale: 'es-ES', timezone: calendarTimeZone, firstDayOfWeek: 1,
    selectedDate: Temporal.PlainDate.from(`${month}-01`),
    views: [createViewMonthGrid(), createViewMonthAgenda()],
    defaultView: 'month-grid', skipAnimations: true,
    calendars: Object.fromEntries(Object.entries(calendarColors).map(([id, color]) => [id, {
      colorName: id, lightColors: { main: color.background, container: color.background, onContainer: color.foreground },
    }])),
    callbacks: {
      onClickDate: date => callbacks.current.onSelectDate?.(date.toString()),
      onSelectedDateUpdate: date => callbacks.current.onSelectDate?.(date.toString()),
      onEventClick: event => callbacks.current.onSelectEvent?.(String(event.id)),
    },
    plugins: [service],
  });
  useEffect(() => {
    service.set(scheduleEvents(events));
  }, [events, service]);
  return <section className="utn-calendar" aria-label="Calendario de eventos"><ScheduleXCalendar calendarApp={calendar} customComponents={{ headerContent: EmptyHeader }} /></section>;
}
