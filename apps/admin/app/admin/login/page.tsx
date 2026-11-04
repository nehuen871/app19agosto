'use client';
import { useEffect, useState } from 'react';
import { BrandMark } from '../../components/BrandMark';
export default function Login() {
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleMessage, setGoogleMessage] = useState('Consultando acceso con Google…');
  useEffect(() => {
    const result = new URL(window.location.href).searchParams.get('authResult');
    const messages: Record<string, string> = { denied: 'Esta cuenta no tiene permiso para administrar.', cancelled: 'Se canceló el ingreso con Google.', invalid: 'El intento de ingreso venció. Intentá nuevamente.', failed: 'No pudimos validar tu cuenta. Intentá nuevamente.', expired: 'Tu sesión venció. Volvé a ingresar.' };
    if (result) { setGoogleMessage(messages[result] ?? 'El ingreso no está disponible.'); window.history.replaceState(null, '', '/admin/login'); }
    fetch('/admin/oauth/config', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('config');
      const config = await response.json(); setGoogleEnabled(config.enabled === true);
      if (!result) setGoogleMessage(config.enabled ? 'Usá tu cuenta de Google autorizada.' : 'El acceso con Google todavía no está configurado.');
    }).catch(() => { if (!result) setGoogleMessage('No pudimos consultar el acceso con Google. Recargá para reintentar.'); });
  }, []);
  return <section className="state"><div className="login-brand"><BrandMark variant="isologo" /></div><p className="eyebrow">Administración</p><h1>Ingresar al panel</h1><p>Ingresá para gestionar noticias, calendario y notificaciones.</p>
    <p role="status">{googleMessage}</p>
    <button type="button" disabled={!googleEnabled} onClick={() => window.location.assign('/admin/oauth/start')}>Continuar con Google</button>

  </section>;
}
