'use client';
import { useActionState, useState } from 'react';
import { saveProfile } from './actions';
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [value, setValue] = useState(name), [state, action, pending] = useActionState(saveProfile, { error: '', saved: false });
  return <form action={action} className="notification-form" aria-busy={pending}>
    <label htmlFor="profile-name">Nombre</label><input id="profile-name" name="name" value={value} onChange={event => setValue(event.target.value)} autoComplete="name" required maxLength={200} disabled={pending} />
    <label htmlFor="profile-email">Correo de Google</label><input id="profile-email" type="email" value={email} readOnly aria-describedby="profile-email-help" />
    <p id="profile-email-help" className="field-help">El correo identifica tu cuenta de Google y no se modifica desde este formulario.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}{state.saved && !state.error && <p role="status">Datos de la cuenta guardados.</p>}
    <button disabled={pending}>{pending ? 'Guardando…' : 'Guardar cambios'}</button>
  </form>;
}
