import { SendPushForm, RefreshPushStatus } from './send-form';
import Link from 'next/link';
import { createApiClient } from '@utn/api-client';
import { requireAdmin } from '../../services/admin-session';
import { logout } from '../login/actions';
import { NotificationForm } from './form';
export const dynamic = 'force-dynamic';
const labels = { DRAFT: 'Borrador', QUEUED: 'En cola', PROCESSING: 'Procesando', SENT: 'Enviada', PARTIAL: 'Envío parcial', FAILED: 'Fallida' };
export default async function Notifications({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const api = await requireAdmin();
  const params = await searchParams;
  const parsed = Number(params.page ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  let data, news;
  try {
    [data, news] = await Promise.all([
      api.notifications(page),
      createApiClient(process.env.API_URL ?? 'http://api:4000/api/v1').news(),
    ]);
  } catch {
    return <section className="state" role="alert"><h1>No pudimos cargar las notificaciones</h1><p>Intentá nuevamente en unos instantes.</p><Link href="/admin/notifications">Reintentar</Link></section>;
  }
  return <>
    <RefreshPushStatus active={data.items.some(item => ['QUEUED', 'PROCESSING'].includes(item.status))} />
    <div className="page-intro"><p className="eyebrow">Administración · UTN FRBA</p><h1>Notificaciones</h1><p>Prepará avisos para la comunidad. Guardar un borrador no envía una notificación push.</p><form action={logout}><button className="button-secondary">Cerrar sesión</button></form></div>
    <div className="notification-columns">
      <section className="news-card" aria-labelledby="new-notification"><h2 id="new-notification">Nueva notificación</h2><NotificationForm news={news.items} /><p className="field-help">Después de guardar el borrador, podés enviarlo a los navegadores que activaron notificaciones en la app.</p></section>
      <section aria-labelledby="saved-notifications"><div className="section-heading"><h2 id="saved-notifications">Guardadas ({data.total})</h2></div>
        {data.items.length === 0 ? <p className="state">Todavía no hay notificaciones. Creá la primera desde el formulario.</p> : <div className="notification-list">{data.items.map(item => <article key={item.id} className="news-card"><span className="badge">{labels[item.status]}</span><h3>{item.title}</h3><p className="notification-body">{item.body}</p>{item.news && <p className="field-help">Noticia: {item.news.title}</p>}<p className="field-help">Destinatarios: {item.requestedRecipients} · Aceptadas: {item.sentCount} · Fallidas: {item.failedCount}. Aceptada no significa leída.</p>{item.status === 'DRAFT' && <SendPushForm id={item.id} />}<time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</time></article>)}</div>}
        <nav className="pagination" aria-label="Páginas de notificaciones">{page > 1 && <Link href={`?page=${page - 1}`}>Anterior</Link>}<span>Página {page}</span>{page * data.limit < data.total && <Link href={`?page=${page + 1}`}>Siguiente</Link>}</nav>
      </section>
    </div>
  </>;
}
