'use client';
import { useActionState } from 'react';
import { calendarColors } from '@utn/design-tokens';
import { calendarDateTime, type CalendarEvent } from '@utn/api-client';
import { saveEvent } from './actions';
export function EventForm({ event }: { event?: CalendarEvent }) {
  const [state, action, pending] = useActionState(saveEvent.bind(null, event?.id ?? null), { error: '', saved: 0 });
  const prefix = event?.id ?? 'new-event';
  return <form action={action} className="notification-form" aria-busy={pending}>
    <label htmlFor={`${prefix}-title`}>Título</label><input id={`${prefix}-title`} name="title" required maxLength={160} defaultValue={event?.title} />
    <label htmlFor={`${prefix}-description`}>Texto del evento</label><textarea id={`${prefix}-description`} name="description" maxLength={5000} rows={4} defaultValue={event?.description} />
    <label htmlFor={`${prefix}-location`}>Lugar (opcional)</label><input id={`${prefix}-location`} name="location" maxLength={300} defaultValue={event?.location} />
    <label htmlFor={`${prefix}-start`}>Inicio</label><input id={`${prefix}-start`} name="startsAt" type="datetime-local" required defaultValue={event && calendarDateTime(event.startsAt)} />
    <label htmlFor={`${prefix}-end`}>Fin</label><input id={`${prefix}-end`} name="endsAt" type="datetime-local" required defaultValue={event && calendarDateTime(event.endsAt)} />
    <span className="field-help">Horarios de Argentina. El fin debe ser posterior al inicio.</span>
    <label htmlFor={`${prefix}-color`}>Color en el calendario</label><select id={`${prefix}-color`} name="color" defaultValue={event?.color ?? 'BLUE'}>{Object.entries(calendarColors).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select>
    <label htmlFor={`${prefix}-status`}>Estado</label><select id={`${prefix}-status`} name="status" defaultValue={event?.status ?? 'DRAFT'}><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicado</option><option value="CANCELLED">Cancelado</option></select>
    <span className="field-help">Solo los eventos publicados aparecen en la app.</span>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}{!state.error && state.saved > 0 && <p role="status">Evento guardado.</p>}
    <button disabled={pending}>{pending ? 'Guardando…' : event ? 'Guardar cambios' : 'Crear evento'}</button>
  </form>;
}
