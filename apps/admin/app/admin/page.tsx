import { createApiClient } from '@utn/api-client';
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const api = createApiClient(process.env.API_URL ?? 'http://api:4000/api/v1');
  let data;
  try {
    data = await api.news();
  } catch {
    return <section className="state" role="alert"><h1>No pudimos cargar las noticias</h1><p>El servicio puede estar sin conexión. Volvé a intentar en unos instantes.</p><a href="/admin">Reintentar</a></section>;
  }
  return <>
    <div className="page-intro"><p className="eyebrow">Actualidad · UTN Buenos Aires</p><h1>Noticias de la facultad</h1><p>Un espacio para las novedades y la información de nuestra comunidad universitaria.</p></div>
    <section aria-labelledby="publicadas">
      <div className="section-heading"><h2 id="publicadas">Últimas publicaciones</h2><span className="badge">{data.total} {data.total === 1 ? 'publicada' : 'publicadas'}</span></div>
      {data.items.length === 0 ? <p className="state">Todavía no hay noticias publicadas.</p> : <div className="news-grid">{data.items.map(news => <article className={`news-card${news.featured ? ' featured' : ''}`} key={news.id}>
        {/* Editorial images may be hosted externally; preserve the original without filters. */}
        {news.coverImageUrl && <img src={news.coverImageUrl} alt={`Imagen de ${news.title}`} loading="lazy" />}
        <div className="badges"><span className="badge">{news.category.name}</span>{news.featured && <span className="badge featured">Destacada</span>}</div>
        <h3>{news.title}</h3>
        {news.publishedAt && <time dateTime={news.publishedAt}>{new Date(news.publishedAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</time>}
        <p>{news.summary}</p>
        <details><summary>Leer noticia</summary><p>{news.content}</p></details>
      </article>)}</div>}
    </section>
  </>;
}
