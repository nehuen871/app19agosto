'use client';
import { useEffect, useRef, useState } from 'react';
import { calendarTimeZone, type CalendarEvent } from '@utn/api-client';
import { calendarColors } from '@utn/design-tokens';
import { AdminEventCalendar } from './calendar';
import { EventForm } from './form';

const statuses = { PUBLISHED: 'Publicado', DRAFT: 'Borrador', CANCELLED: 'Cancelado' };
function dateTime(value: string) {
  return new Date(value).toLocaleString('es-AR', { timeZone: calendarTimeZone, dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' });
}
export function EventManager({ events, total, page, limit }: { events: CalendarEvent[]; total: number; page: number; limit: number }) {
  // undefined = table only, null = create, event = edit.
  const [editor, setEditor] = useState<CalendarEvent | null | undefined>();
  const panel = useRef<HTMLElement>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (editor === undefined) return;
    panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    panel.current?.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus({ preventScroll: true });
  }, [editor]);
  function edit(id: string) { const event = events.find(item => item.id === id); if (event) setEditor(event); }
  return <div className="record-manager">
    <section className="record-table-panel" aria-labelledby="events-heading">
      <div className="section-heading"><div><h2 id="events-heading">Eventos ({total})</h2><p className="field-help">Fechas y horarios de Argentina.</p></div><button ref={createButton} onClick={() => setEditor(null)} aria-controls="event-editor">Crear evento</button></div>
      {events.length === 0 ? <div className="state"><h3>Todavía no hay eventos</h3><p>Usá Crear evento para agregar el primero.</p></div> : <div className="record-table-scroll" role="region" aria-label="Listado de eventos, desplazable horizontalmente" tabIndex={0}>
        <table className="record-table">
          <caption>Eventos guardados · página {page}</caption>
          <thead><tr><th scope="col">Evento</th><th scope="col">Inicio</th><th scope="col">Fin</th><th scope="col">Lugar</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
          <tbody>{events.map(event => <tr key={event.id}>
            <th scope="row"><span className="record-table-title">{event.title}</span><span className="badge" style={{ backgroundColor: calendarColors[event.color].background, color: calendarColors[event.color].foreground }}>{calendarColors[event.color].label}</span></th>
            <td><time dateTime={event.startsAt}>{dateTime(event.startsAt)}</time></td><td><time dateTime={event.endsAt}>{dateTime(event.endsAt)}</time></td>
            <td>{event.location || 'Sin lugar definido'}</td><td><span className="badge">{statuses[event.status]}</span></td>
            <td><button className="button-secondary" onClick={() => setEditor(event)} aria-label={`Editar ${event.title}`} aria-controls="event-editor">Editar</button></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <nav className="pagination" aria-label="Páginas de eventos">{page > 1 && <a href={`?page=${page - 1}`}>Anterior</a>}<span>Página {page}</span>{page * limit < total && <a href={`?page=${page + 1}`}>Siguiente</a>}</nav>
    </section>
    {editor !== undefined && <section ref={panel} id="event-editor" className="record-editor" aria-labelledby="event-editor-heading">
      <div className="section-heading"><h2 id="event-editor-heading">{editor ? 'Editar evento' : 'Crear evento'}</h2><button className="button-secondary" onClick={() => { setEditor(undefined); createButton.current?.focus(); }}>Volver al listado</button></div>
      <EventForm key={editor?.id ?? 'new'} event={editor ?? undefined} />
    </section>}
    <details className="event-calendar-secondary"><summary>Ver calendario de esta página</summary><AdminEventCalendar events={events} onSelectEvent={edit} /></details>
  </div>;
}
