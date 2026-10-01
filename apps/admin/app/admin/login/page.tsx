'use client';
import { useActionState } from 'react';
import { login } from './actions';
export default function Login() {
  const [state, action, pending] = useActionState(login, { error: '' });
  return <section className="state"><p className="eyebrow">Administración</p><h1>Ingresar al panel</h1><p>Ingresá tu clave de administrador para gestionar las notificaciones.</p>
    <form action={action} className="notification-form">
      <label htmlFor="key">Clave de administrador</label>
      <input id="key" name="key" type="password" autoComplete="current-password" required maxLength={256} aria-describedby={state.error ? 'login-error' : undefined} />
      {state.error && <p id="login-error" className="form-error" role="alert">{state.error}</p>}
      <button disabled={pending}>{pending ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  </section>;
}
