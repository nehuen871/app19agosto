import { requireAdmin } from '../../services/admin-session';
import { CategoryManager } from './manager';
export const dynamic = 'force-dynamic';
export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const api = await requireAdmin();
  const params = await searchParams, parsed = Number(params.page ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  let data;
  try { data = { ...await api.categories(page), choices: await api.categoryChoices() }; }
  catch { return <section className="state" role="alert"><h1>No pudimos cargar las categorías</h1><p>Revisá la conexión e intentá nuevamente.</p><a href="/admin/categories">Reintentar</a></section>; }
  return <><div className="page-intro"><p className="eyebrow">Administración</p><h1>Categorías de noticias</h1><p>Organizá categorías y subcategorías anidadas. Las que tienen noticias o subcategorías no se pueden eliminar.</p></div><CategoryManager {...data} /></>;
}
