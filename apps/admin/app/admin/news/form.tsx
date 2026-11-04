'use client';
import { useActionState, useEffect, useState } from 'react';
import { ImageUpload } from './image-upload';
import { saveNews } from './actions';
export function NewsForm() {
  const [state, action, pending] = useActionState(saveNews, { error: '', saved: 0, message: '' });
  const [fields, setFields] = useState({ title: '', slug: '', category: '', summary: '', content: '', coverImageUrl: '', featured: false, status: 'DRAFT' });
  const update = (name: string, value: string | boolean) => setFields(previous => ({ ...previous, [name]: value }));
  const [imageId, setImageId] = useState(''), [uploading, setUploading] = useState(false);
  useEffect(() => { setImageId(''); }, [state.saved]);
  return <form action={action} className="notification-form" aria-busy={pending}>
    <label htmlFor="news-title">Título</label><input id="news-title" name="title" value={fields.title} onChange={event => update('title', event.target.value)} required maxLength={160} />
    <label htmlFor="news-slug">Identificador de la noticia</label><input id="news-slug" name="slug" value={fields.slug} onChange={event => update('slug', event.target.value)} required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="inscripcion-a-finales" aria-describedby="slug-help" />
    <span id="slug-help" className="field-help">Usá letras minúsculas, números y guiones. Debe ser único.</span>
    <label htmlFor="news-category">Categoría</label><input id="news-category" name="category" value={fields.category} onChange={event => update('category', event.target.value)} required maxLength={100} placeholder="Académicas" />
    <label htmlFor="news-summary">Resumen</label><textarea id="news-summary" name="summary" value={fields.summary} onChange={event => update('summary', event.target.value)} required maxLength={500} rows={3} />
    <label htmlFor="news-content">Contenido</label><textarea id="news-content" name="content" value={fields.content} onChange={event => update('content', event.target.value)} required maxLength={20000} rows={7} />
    <label htmlFor="news-image">URL de imagen (opcional)</label><input id="news-image" name="coverImageUrl" value={fields.coverImageUrl} onChange={event => update('coverImageUrl', event.target.value)} type="url" placeholder="https://…" />
    <ImageUpload key={state.saved} onChange={(id, busy) => { setImageId(id); setUploading(busy); }} />
    <input type="hidden" name="coverImageId" value={imageId} />
    <span className="field-help">Si subís un archivo, se utiliza en lugar de la URL.</span>
    <label className="checkbox-label"><input name="featured" type="checkbox" checked={fields.featured} onChange={event => update('featured', event.target.checked)} /> Destacada</label>
    <label htmlFor="news-status">Guardar como</label><select id="news-status" name="status" value={fields.status} onChange={event => update('status', event.target.value)}><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicada</option></select>
    <span className="field-help">Una noticia publicada aparece en la app. Guardarla no envía notificaciones.</span>
    {state.error && <p role="alert" className="form-error">{state.error} <a href="/admin/login" target="_blank" rel="noopener noreferrer">Abrir ingreso en otra pestaña</a></p>}
    {!state.error && state.saved > 0 && <p role="status">{state.message}</p>}
    <button disabled={pending || uploading}>{pending ? 'Guardando…' : uploading ? 'Subiendo imagen…' : 'Guardar noticia'}</button>
  </form>;
}
