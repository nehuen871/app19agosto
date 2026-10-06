'use client';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendNotification } from './actions';
export function SendPushForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(sendNotification.bind(null, id), { error: '', sent: false });
  return <form action={action} aria-busy={pending} className="notification-form">
    <label className="checkbox-label"><input type="checkbox" name="confirm" required /> Confirmo el envío a los dispositivos suscriptos</label>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    {state.sent && <p role="status">Envío en cola.</p>}
    <button disabled={pending || state.sent}>{pending ? 'Iniciando…' : 'Enviar push'}</button>
  </form>;
}
export function RefreshPushStatus({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => { if (!active) return; const timer = setInterval(() => router.refresh(), 3000); return () => clearInterval(timer); }, [active, router]);
  return null;
}
