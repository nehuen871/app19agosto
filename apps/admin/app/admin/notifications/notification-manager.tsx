'use client';
import { useEffect, useRef, useState } from 'react';
import type { Notification } from '@utn/api-client';
import { NotificationForm } from './form';
import { SendPushForm } from './send-form';
const labels = { DRAFT: 'Borrador', QUEUED: 'En cola', PROCESSING: 'Procesando', SENT: 'Enviada', PARTIAL: 'Envío parcial', FAILED: 'Fallida' };
function dateTime(value: string) {
  return new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' });
}
export function NotificationManager({ notifications, news, total, page, limit }: {
  notifications: Notification[]; news: { id: string; title: string }[]; total: number; page: number; limit: number;
}) {
  const [selection, setSelection] = useState<'create' | { id: string } | null>(null);
  const panel = useRef<HTMLElement>(null), createButton = useRef<HTMLButtonElement>(null);
  const selected = selection && selection !== 'create' ? notifications.find(item => item.id === selection.id) : undefined;
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!selection) {
      if (restoreFocus.current) { createButton.current?.focus(); restoreFocus.current = false; }
      return;
    }
    restoreFocus.current = true;
    panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (selection === 'create') panel.current?.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus({ preventScroll: true });
    else panel.current?.focus({ preventScroll: true });
  }, [selection]);
  function close() { setSelection(null); }
  return <div className="record-manager">
    {!selection && <section className="record-table-panel" aria-labelledby="notifications-heading">
      <div className="section-heading"><div><h2 id="notifications-heading">Notificaciones ({total})</h2><p className="field-help">Borradores, envíos y resultados de entrega.</p></div><button ref={createButton} onClick={() => setSelection('create')} aria-controls="notification-editor">Crear notificación</button></div>
      {notifications.length === 0 ? <div className="state"><h3>Todavía no hay notificaciones</h3><p>Usá Crear notificación para preparar el primer aviso.</p></div> : <div className="record-table-scroll" role="region" aria-label="Listado de notificaciones, desplazable horizontalmente" tabIndex={0}>
        <table className="record-table"><caption>Notificaciones guardadas · página {page}</caption>
          <thead><tr><th scope="col">Notificación</th><th scope="col">Estado</th><th scope="col">Creación</th><th scope="col">Destinatarios</th><th scope="col">Aceptadas</th><th scope="col">Fallidas</th><th scope="col">Acciones</th></tr></thead>
          <tbody>{notifications.map(item => <tr key={item.id}>
            <th scope="row"><span className="record-table-title">{item.title}</span>{item.news && <span className="field-help">Noticia: {item.news.title}</span>}</th>
            <td><span className="badge">{labels[item.status]}</span></td><td><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time></td>
            <td>{item.requestedRecipients}</td><td>{item.sentCount}</td><td>{item.failedCount}</td>
            <td><button className="button-secondary" onClick={() => setSelection({ id: item.id })} aria-label={`Ver detalle de ${item.title}`} aria-controls="notification-editor">Ver detalle</button></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <p className="field-help">Aceptada significa que el servicio recibió el envío; no confirma que la notificación haya sido leída.</p>
      <nav className="pagination" aria-label="Páginas de notificaciones">{page > 1 && <a href={`?page=${page - 1}`}>Anterior</a>}<span>Página {page}</span>{page * limit < total && <a href={`?page=${page + 1}`}>Siguiente</a>}</nav>
    </section>}
    {selection && <section ref={panel} id="notification-editor" className="record-editor" tabIndex={-1} aria-labelledby="notification-editor-heading">
      <div className="section-heading"><h2 id="notification-editor-heading">{selection === 'create' ? 'Crear notificación' : 'Detalle de notificación'}</h2><button className="button-secondary" onClick={close}>Volver al listado</button></div>
      {selection === 'create' ? <><NotificationForm news={news} /><p className="field-help">Guardar un borrador no envía un push. El envío se confirma desde el detalle.</p></> : selected ? <article className="news-card">
        <div className="badges"><span className="badge">{labels[selected.status]}</span></div><h3>{selected.title}</h3><p className="notification-body">{selected.body}</p>
        {selected.news && <p className="field-help">Noticia: {selected.news.title}</p>}
        <dl className="notification-metrics"><div><dt>Destinatarios</dt><dd>{selected.requestedRecipients}</dd></div><div><dt>Aceptadas</dt><dd>{selected.sentCount}</dd></div><div><dt>Fallidas</dt><dd>{selected.failedCount}</dd></div></dl>
        <p className="field-help">Creada: <time dateTime={selected.createdAt}>{dateTime(selected.createdAt)}</time></p>
        {selected.sentAt && <p className="field-help">Finalización del envío: <time dateTime={selected.sentAt}>{dateTime(selected.sentAt)}</time></p>}
        {selected.status === 'DRAFT' && <SendPushForm key={selected.id} id={selected.id} />}
      </article> : <p role="status">Esta notificación ya no está en la página actual. Volvé al listado para seleccionarla.</p>}
    </section>}
  </div>;
}
