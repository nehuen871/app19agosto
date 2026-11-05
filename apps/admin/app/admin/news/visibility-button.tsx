'use client';
import { useActionState } from 'react';
import { setNewsVisibility } from './actions';
export function NewsVisibilityButton({ id, title, published, editing }: { id: string; title: string; published: boolean; editing: boolean }) {
  const [state, action, pending] = useActionState(setNewsVisibility.bind(null, id, !published), { error: '', message: '' });
  const label = published ? 'Ocultar' : 'Publicar';
  return <form action={action} aria-busy={pending} className="news-visibility-action">
    <button className={published ? 'button-danger' : 'button-success'} disabled={pending || editing} aria-label={`${label} ${title}`} title={editing ? 'Volvé al listado antes de cambiar la visibilidad.' : undefined}>
      {pending ? published ? 'Ocultando…' : 'Publicando…' : label}
    </button>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    {state.message && <p role="status" className="field-help">{state.message}</p>}
  </form>;
}
