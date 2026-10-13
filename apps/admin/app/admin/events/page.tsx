import { logout } from '../login/actions';
import { calendarColors } from '@utn/design-tokens';
import { calendarTimeZone } from '@utn/api-client';
import { requireAdmin } from '../../services/admin-session';
import { EventForm } from './form';
export const dynamic = 'force-dynamic';
export default async function Events({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const api = await requireAdmin(), params = await searchParams;
  const parsed = Number(params.page ?? 1), page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  let data;
  try { data = await api.events(page); }
  catch { return <section className="state" role="alert"><h1>No pudimos cargar los eventos</h1><p>Revisá tu conexión e intentá nuevamente.</p><a href="/admin/events">Reintentar</a></section>; }
  return <>
    <div className="page-intro"><p className="eyebrow">Administración</p><h1>Calendario de eventos</h1><p>Configurá fechas, texto y colores para el calendario de la app.</p><form action={logout}><button className="button-secondary">Cerrar sesión</button></form></div>
    <div className="notification-columns"><section><h2>Nuevo evento</h2><EventForm /></section><section><h2>Eventos guardados ({data.total})</h2>
      <div className="notification-list">{data.items.length === 0 ? <p>Todavía no hay eventos.</p> : data.items.map(event => <article className="news-card" key={event.id}>
        <div className="badges"><span className="badge" style={{ backgroundColor: calendarColors[event.color].background, color: calendarColors[event.color].foreground }}>{calendarColors[event.color].label}</span><span className="badge">{event.status === 'PUBLISHED' ? 'Publicado' : event.status === 'DRAFT' ? 'Borrador' : 'Cancelado'}</span></div>
        <h3>{event.title}</h3><p>{new Date(event.startsAt).toLocaleString('es-AR', { timeZone: calendarTimeZone })} – {new Date(event.endsAt).toLocaleString('es-AR', { timeZone: calendarTimeZone })}</p><p className="notification-body">{event.description}</p>{event.location && <p>Lugar: {event.location}</p>}
        <details><summary>Editar evento</summary><EventForm event={event} /></details>
      </article>)}</div>
      <nav className="pagination" aria-label="Páginas de eventos">{page > 1 && <a href={`?page=${page - 1}`}>Anterior</a>}<span>Página {page}</span>{page * data.limit < data.total && <a href={`?page=${page + 1}`}>Siguiente</a>}</nav>
    </section></div>
  </>;
}
