import { requireAdmin } from '../../services/admin-session';
import { EventManager } from './event-manager';
export const dynamic = 'force-dynamic';
export default async function Events({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const api = await requireAdmin(), params = await searchParams;
  const parsed = Number(params.page ?? 1), page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  let data;
  try { data = await api.events(page); }
  catch { return <section className="state" role="alert"><h1>No pudimos cargar los eventos</h1><p>Revisá tu conexión e intentá nuevamente.</p><a href="/admin/events">Reintentar</a></section>; }
  return <>
    <div className="page-intro"><p className="eyebrow">Administración</p><h1>Eventos</h1><p>Consultá los eventos y creá o editá sus datos para el calendario de la app.</p></div>
    <EventManager events={data.items} total={data.total} page={page} limit={data.limit} />
  </>;
}
