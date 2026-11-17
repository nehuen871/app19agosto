'use client';
import { useActionState, useEffect, useState } from 'react';
import { categoryLabel, categoryPath, type Category } from '@utn/api-client';
import { saveCategory, deleteCategory } from './actions';
type Row = Category & { _count: { news: number; children: number } };
function CategoryForm({ category, choices, defaultParent }: { category: Category | null; choices: Category[]; defaultParent: string | null }) {
  const [state, action, pending] = useActionState(saveCategory.bind(null, category?.id ?? null), { error: '', message: '', saved: 0 });
  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState(category ? category.parentId ?? '' : defaultParent ?? '');
  const parents = choices.filter(choice => !category || !categoryPath(choices, choice.slug).some(ancestor => ancestor.id === category.id));
  useEffect(() => { if (state.saved > 0 && !category) setName(''); }, [state.saved, category]);
  return <form action={action} className="notification-form">
    <label htmlFor="category-name">Nombre de la categoría</label><input id="category-name" name="name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} disabled={pending} />
    <label htmlFor="category-parent">Categoría superior</label><select id="category-parent" name="parentId" value={parentId} onChange={event => setParentId(event.target.value)} disabled={pending}><option value="">Sin categoría superior</option>{parents.map(parent => <option key={parent.id} value={parent.id}>{categoryLabel(choices, parent)}</option>)}</select>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}
    <button disabled={pending}>{pending ? 'Guardando…' : category ? 'Guardar cambios' : 'Crear categoría'}</button>
  </form>;
}
function DeleteCategory({ category }: { category: Row }) {
  const [confirm, setConfirm] = useState(false);
  const [state, action, pending] = useActionState(deleteCategory.bind(null, category.id), { error: '', message: '' });
  return <div>{category._count.news > 0 || category._count.children > 0 ? <span className="field-help">En uso</span> : !confirm ? <button className="button-secondary" onClick={() => setConfirm(true)} aria-label={`Eliminar ${category.name}`}>Eliminar</button> : <form action={action}><p>¿Eliminar “{category.name}”?</p><div className="record-actions"><button disabled={pending}>{pending ? 'Eliminando…' : 'Confirmar eliminación'}</button><button type="button" className="button-secondary" disabled={pending} onClick={() => setConfirm(false)}>Cancelar</button></div></form>}{state.error && <p role="alert" className="form-error">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}</div>;
}
export function CategoryManager({ items, total, page, limit, choices }: { choices: Category[]; items: Row[]; total: number; page: number; limit: number }) {
  const [editor, setEditor] = useState<Category | null | undefined>(undefined);
  const [defaultParent, setDefaultParent] = useState<string | null>(null);
  return <div className="record-manager">
    {editor !== undefined ? <section className="record-editor"><div className="section-heading"><h2>{editor ? 'Editar categoría' : 'Crear categoría'}</h2><button className="button-secondary" onClick={() => setEditor(undefined)}>Volver al listado</button></div><CategoryForm key={editor?.id ?? 'new'} category={editor} choices={choices} defaultParent={defaultParent} /></section> : <section className="record-table-panel">
      <div className="section-heading"><h2>Categorías ({total})</h2><button onClick={() => { setDefaultParent(null); setEditor(null); }}>Crear categoría</button></div>
      {items.length === 0 ? <div className="state"><h3>Todavía no hay categorías</h3><p>Creá una para poder redactar noticias.</p></div> : <div className="record-table-scroll" role="region" aria-label="Listado de categorías" tabIndex={0}><table className="record-table"><caption>Categorías de noticias · página {page}</caption><thead><tr><th scope="col">Nombre</th><th scope="col">Noticias asociadas</th><th scope="col">Acciones</th></tr></thead><tbody>{items.map(category => <tr key={category.id}><th scope="row">{categoryLabel(choices, category)}</th><td>{category._count.news}</td><td><div className="record-actions"><button className="button-secondary" onClick={() => setEditor(category)} aria-label={`Editar ${category.name}`}>Editar</button><button className="button-secondary" onClick={() => { setDefaultParent(category.id); setEditor(null); }} aria-label={`Agregar subcategoría a ${category.name}`}>Agregar subcategoría</button><DeleteCategory category={category} /></div></td></tr>)}</tbody></table></div>}
      <nav className="pagination" aria-label="Páginas de categorías">{page > 1 && <a href={`/admin/categories?page=${page - 1}`}>Anterior</a>}<span>Página {page}</span>{page * limit < total && <a href={`/admin/categories?page=${page + 1}`}>Siguiente</a>}</nav>
    </section>}
  </div>;
}
