'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { calendarDate, calendarMonthShift, type CalendarEvent } from '@utn/api-client';
const Calendar = dynamic(() => import('@utn/calendar').then(module => module.EventCalendar), { ssr: false, loading: () => <p role="status">Cargando calendario…</p> });
export function AdminEventCalendar({ events, onSelectEvent }: { events: CalendarEvent[]; onSelectEvent: (id: string) => void }) {
  const [month, setMonth] = useState(() => calendarDate(events[0]?.startsAt ?? new Date()).slice(0, 7));
  return <section className="calendar-panel">
    <div className="section-heading"><h2>Agenda visual</h2><span>{new Date(`${month}-01T12:00:00-03:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span></div>
    <nav className="pagination" aria-label="Mes del calendario"><button className="button-secondary" disabled={month === '2000-01'} onClick={() => setMonth(calendarMonthShift(month, -1))}>Mes anterior</button><button className="button-secondary" disabled={month === '2100-12'} onClick={() => setMonth(calendarMonthShift(month, 1))}>Mes siguiente</button></nav>
    <p className="field-help">Muestra los eventos de esta página. Seleccioná un evento para abrir su formulario de edición.</p>
    <Calendar key={month} month={month} events={events} onSelectEvent={onSelectEvent} />
  </section>;
}
