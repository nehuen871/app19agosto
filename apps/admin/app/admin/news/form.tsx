'use client';
import { useActionState } from 'react';
import { saveNews } from './actions';
export function NewsForm() {
  const [state, action, pending] = useActionState(saveNews, { error: '', saved: 0, message: '' });
  return <form action={action} className="notification-form" aria-busy={pending}>
    <label htmlFor="news-title">Título</label><input id="news-title" name="title" required maxLength={160} />
    <label htmlFor="news-slug">Identificador de la noticia</label><input id="news-slug" name="slug" required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="inscripcion-a-finales" aria-describedby="slug-help" />
    <span id="slug-help" className="field-help">Usá letras minúsculas, números y guiones. Debe ser único.</span>
    <label htmlFor="news-category">Categoría</label><input id="news-category" name="category" required maxLength={100} placeholder="Académicas" />
    <label htmlFor="news-summary">Resumen</label><textarea id="news-summary" name="summary" required maxLength={500} rows={3} />
    <label htmlFor="news-content">Contenido</label><textarea id="news-content" name="content" required maxLength={20000} rows={7} />
    <label htmlFor="news-image">URL de imagen (opcional)</label><input id="news-image" name="coverImageUrl" type="url" placeholder="https://…" />
    <label className="checkbox-label"><input name="featured" type="checkbox" /> Destacada</label>
    <label htmlFor="news-status">Guardar como</label><select id="news-status" name="status"><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicada</option></select>
    <span className="field-help">Una noticia publicada aparece en la app. Guardarla no envía notificaciones.</span>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    {!state.error && state.saved > 0 && <p role="status">{state.message}</p>}
    <button disabled={pending}>{pending ? 'Guardando…' : 'Guardar noticia'}</button>
  </form>;
}
