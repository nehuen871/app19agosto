'use client';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { saveNotification } from './actions';
export function NotificationForm({ news }: { news: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(saveNotification, { error: '', saved: 0 });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [newsId, setNewsId] = useState('');
  useEffect(() => { if (state.saved) { setTitle(''); setBody(''); setNewsId(''); } }, [state.saved]);
  return <form method="post" aria-busy={pending} onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }} className="notification-form">
    <label htmlFor="title">Título</label>
    <input id="title" name="title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={100} placeholder="Ej. Inscripción a finales" aria-describedby="title-help" />
    <span className="field-help" id="title-help">Hasta 100 caracteres.</span>
    <label htmlFor="body">Mensaje</label>
    <textarea id="body" name="body" value={body} onChange={event => setBody(event.target.value)} required maxLength={500} rows={4} placeholder="Escribí el mensaje de la notificación" aria-describedby="body-help" />
    <span className="field-help" id="body-help">Hasta 500 caracteres.</span>
    <label htmlFor="newsId">Noticia vinculada (opcional)</label>
    <select id="newsId" name="newsId" value={newsId} onChange={event => setNewsId(event.target.value)} aria-describedby="news-help"><option value="">Sin noticia vinculada</option>{news.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
    <span className="field-help" id="news-help">Podés elegir entre las últimas 20 noticias publicadas.</span>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {!state.error && state.saved > 0 && <p role="status">Notificación guardada como borrador.</p>}
    <button disabled={pending}>{pending ? 'Guardando…' : 'Guardar borrador'}</button>
  </form>;
}
