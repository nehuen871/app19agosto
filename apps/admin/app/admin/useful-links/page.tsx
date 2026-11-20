import { requireAdmin } from '../../services/admin-session';
import { UsefulLinkManager } from './manager';
export const dynamic = 'force-dynamic';
export default async function UsefulLinksPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const api = await requireAdmin(), params = await searchParams, parsed = Number(params.page ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  let data;
  try { data = await api.usefulLinks(page); }
  catch { return <section className="state" role="alert"><h1>No pudimos cargar los links útiles</h1><p>Revisá la conexión e intentá nuevamente.</p><a href="/admin/useful-links">Reintentar</a></section>; }
  return <><div className="page-intro"><p className="eyebrow">Administración · Estudiante</p><h1>Links útiles</h1><p>Imagen, texto y destino de los accesos de la app. Un orden menor aparece primero; los destacados ocupan el ancho completo del mosaico.</p></div><UsefulLinkManager {...data} /></>;
}
