import { RefreshPushStatus } from './send-form';
import Link from 'next/link';
import { requireAdmin } from '../../services/admin-session';
import { NotificationManager } from './notification-manager';
export const dynamic = 'force-dynamic';
export default async function Notifications({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const api = await requireAdmin();
  const params = await searchParams;
  const parsed = Number(params.page ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  let data, news;
  try {
    [data, news] = await Promise.all([
      api.notifications(page),
      api.publishedNews(),
    ]);
  } catch {
    return <section className="state" role="alert"><h1>No pudimos cargar las notificaciones</h1><p>Intentá nuevamente en unos instantes.</p><Link href="/admin/notifications">Reintentar</Link></section>;
  }
  return <>
    <RefreshPushStatus active={data.items.some(item => ['QUEUED', 'PROCESSING'].includes(item.status))} />
    <div className="page-intro"><p className="eyebrow">Administración · UTN FRBA</p><h1>Notificaciones</h1><p>Prepará avisos para la comunidad. Guardar un borrador no envía una notificación push.</p></div>
    <NotificationManager notifications={data.items} news={news.items} total={data.total} page={page} limit={data.limit} />
  </>;
}
