'use client';
import { useActionState, useCallback, useEffect, useState } from 'react';
import type { UsefulLink } from '@utn/api-client';
import { ImageUpload } from '../news/image-upload';
import { saveUsefulLink, deleteUsefulLink } from './actions';

function LinkForm({ item, onSaved }: { item: UsefulLink | null; onSaved: () => void }) {
  const [state, action, pending] = useActionState(saveUsefulLink.bind(null, item?.id ?? null, item?.updatedAt ?? null), { error: '', saved: 0 });
  const [imageId, setImageId] = useState(item?.imageId ?? ''), [uploading, setUploading] = useState(false);
  const [fields, setFields] = useState({ title: item?.title ?? '', description: item?.description ?? '', url: item?.url ?? '', priority: String(item?.priority ?? 100), featured: item?.featured ?? false, published: item?.published ?? false });
  useEffect(() => { if (state.saved) onSaved(); }, [state.saved, onSaved]);
  return <form action={action} className="notification-form" aria-busy={pending}>
    <label htmlFor="useful-title">Título</label><input id="useful-title" name="title" value={fields.title} onChange={e => setFields({ ...fields, title: e.target.value })} required maxLength={120} disabled={pending} />
    <label htmlFor="useful-description">Texto</label><textarea id="useful-description" name="description" value={fields.description} onChange={e => setFields({ ...fields, description: e.target.value })} required maxLength={500} rows={3} disabled={pending} /><span className="field-help">Hasta 500 caracteres.</span>
    <label htmlFor="useful-url">Enlace de destino</label><input id="useful-url" name="url" type="url" value={fields.url} onChange={e => setFields({ ...fields, url: e.target.value })} placeholder="https://…" required maxLength={2048} disabled={pending} /><span className="field-help">URL completa HTTP o HTTPS. Se abre fuera de la app.</span>
    <ImageUpload disabled={pending} label="Imagen del enlace (obligatoria)" alt="Vista previa de la imagen del enlace" onChange={(id, busy) => { if (id) setImageId(id); setUploading(busy); }} />
    <input name="imageId" type="hidden" value={imageId} />
    {imageId && <img className="image-preview" src={`/admin/media/${imageId}`} alt="Imagen guardada para este enlace" />}
    <label htmlFor="useful-priority">Orden de importancia</label><input id="useful-priority" name="priority" type="number" min={1} max={9999} step={1} value={fields.priority} onChange={e => setFields({ ...fields, priority: e.target.value })} required disabled={pending} /><span className="field-help">1 es la mayor prioridad. Si dos enlaces tienen el mismo número, conservan un orden estable.</span>
    <label className="checkbox-label"><input name="featured" type="checkbox" checked={fields.featured} onChange={e => setFields({ ...fields, featured: e.target.checked })} disabled={pending} /> Destacado: tarjeta de ancho completo</label>
    <label className="checkbox-label"><input name="published" type="checkbox" checked={fields.published} onChange={e => setFields({ ...fields, published: e.target.checked })} disabled={pending} /> Publicado en la app</label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button disabled={pending || uploading || !imageId}>{pending ? 'Guardando…' : 'Guardar enlace'}</button>
  </form>;
}
function DeleteLink({ item }: { item: UsefulLink }) {
  const [confirm, setConfirm] = useState(false), [state, action, pending] = useActionState(deleteUsefulLink.bind(null, item.id, item.updatedAt), { error: '' });
  return <div>{!confirm ? <button className="button-secondary" onClick={() => setConfirm(true)} aria-label={`Eliminar ${item.title}`}>Eliminar</button> : <form action={action}><p>¿Eliminar “{item.title}” de la app?</p><div className="record-actions"><button disabled={pending}>{pending ? 'Eliminando…' : 'Confirmar eliminación'}</button><button type="button" className="button-secondary" disabled={pending} onClick={() => setConfirm(false)}>Cancelar</button></div></form>}{state.error && <p role="alert" className="form-error">{state.error}</p>}</div>;
}
export function UsefulLinkManager({ items, total, page, limit }: { items: UsefulLink[]; total: number; page: number; limit: number }) {
  const [editor, setEditor] = useState<UsefulLink | null | undefined>(undefined), [saved, setSaved] = useState(false);
  const onSaved = useCallback(() => { setEditor(undefined); setSaved(true); }, []);
  return <div className="record-manager">{saved && <p role="status">Enlace guardado. Los publicados están disponibles en Estudiante.</p>}
    {editor !== undefined ? <section className="record-editor"><div className="section-heading"><h2>{editor ? 'Editar enlace' : 'Crear enlace'}</h2><button className="button-secondary" onClick={() => setEditor(undefined)}>Volver al listado</button></div><LinkForm key={editor?.id ?? 'new'} item={editor} onSaved={onSaved} /></section> : <section className="record-table-panel">
      <div className="section-heading"><h2>Links útiles ({total})</h2><button onClick={() => { setEditor(null); setSaved(false); }}>Crear enlace</button></div>
      {!items.length ? <div className="state"><h3>No hay enlaces cargados</h3><p>Creá el primer acceso para Estudiante.</p></div> : <div className="record-table-scroll" role="region" aria-label="Listado de links útiles" tabIndex={0}><table className="record-table"><caption>Links útiles · página {page}</caption><thead><tr><th scope="col">Orden</th><th scope="col">Enlace</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.priority}</td><th scope="row">{item.title}<p className="field-help">{item.description}</p></th><td>{item.published ? 'Publicado' : 'Borrador'}{item.featured && ' · Destacado'}</td><td><div className="record-actions"><button className="button-secondary" onClick={() => { setEditor(item); setSaved(false); }} aria-label={`Editar ${item.title}`}>Editar</button><DeleteLink key={item.id + item.updatedAt} item={item} /></div></td></tr>)}</tbody></table></div>}
      <nav className="pagination" aria-label="Páginas de links útiles">{page > 1 && <a href={`/admin/useful-links?page=${page - 1}`}>Anterior</a>}<span>Página {page}</span>{page * limit < total && <a href={`/admin/useful-links?page=${page + 1}`}>Siguiente</a>}</nav>
    </section>}
  </div>;
}
