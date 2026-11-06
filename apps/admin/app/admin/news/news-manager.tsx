'use client';
import { useEffect, useRef, useState } from 'react';
import type { AdminNews } from '@utn/api-client';
import { NewsVisibilityButton } from './visibility-button';
import { NewsForm } from './form';
const statuses = { PUBLISHED: 'Publicada', DRAFT: 'Borrador', ARCHIVED: 'Oculta' };
export function NewsManager({ news, total, page, limit }: { news: AdminNews[]; total: number; page: number; limit: number }) {
  const [editor, setEditor] = useState<{ news?: AdminNews } | null>(null);
  const panel = useRef<HTMLElement>(null), createButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!editor) {
      if (restoreFocus.current) { createButton.current?.focus(); restoreFocus.current = false; }
      return;
    }
    restoreFocus.current = true;
    panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    panel.current?.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus({ preventScroll: true });
  }, [editor]);
  return <div className="record-manager">
    {!editor && <section className="record-table-panel" aria-labelledby="news-heading">
      <div className="section-heading"><div><h2 id="news-heading">Noticias ({total})</h2><p className="field-help">Publicaciones y borradores de la app.</p></div><button ref={createButton} onClick={() => setEditor({})} aria-controls="news-editor">Crear noticia</button></div>
      {news.length === 0 ? <div className="state"><h3>Todavía no hay noticias</h3><p>Usá Crear noticia para agregar la primera.</p></div> : <div className="record-table-scroll" role="region" aria-label="Listado de noticias, desplazable horizontalmente" tabIndex={0}>
        <table className="record-table"><caption>Noticias guardadas · página {page}</caption>
          <thead><tr><th scope="col">Noticia</th><th scope="col">Categoría</th><th scope="col">Estado</th><th scope="col">Publicación</th><th scope="col">Acciones</th></tr></thead>
          <tbody>{news.map(item => <tr key={item.id}>
            <th scope="row"><span className="record-table-title">{item.title}</span>{item.featured && <span className="badge featured">Destacada</span>}</th>
            <td>{item.category.name}</td><td><span className="badge">{statuses[item.status]}</span></td>
            <td>{item.publishedAt ? <time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' })}</time> : 'Sin publicar'}</td>
            <td><div className="record-actions"><button className="button-secondary" onClick={() => setEditor({ news: item })} aria-label={`Editar ${item.title}`} aria-controls="news-editor">Editar</button><NewsVisibilityButton id={item.id} title={item.title} published={item.status === 'PUBLISHED'} editing={false} /></div></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <nav className="pagination" aria-label="Páginas de noticias">{page > 1 && <a href={`/admin?page=${page - 1}`}>Anterior</a>}<span>Página {page}</span>{page * limit < total && <a href={`/admin?page=${page + 1}`}>Siguiente</a>}</nav>
    </section>}
    {editor && <section ref={panel} id="news-editor" className="record-editor" aria-labelledby="news-editor-heading">
      <div className="section-heading"><h2 id="news-editor-heading">{editor.news ? 'Editar noticia' : 'Crear noticia'}</h2><button className="button-secondary" onClick={() => { setEditor(null); }}>Volver al listado</button></div>
      <NewsForm key={editor.news?.id ?? 'new'} news={editor.news} />
    </section>}
  </div>;
}
