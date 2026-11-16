'use client';
import { useEffect, useState } from 'react';
import { BrandMark } from '../../components/BrandMark';
import { loadAdminLoginConfig } from '../../services/login-config';
export default function Login() {
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleMessage, setGoogleMessage] = useState('Consultando acceso con Google…');
  const [configState, setConfigState] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setConfigState('loading');
    setGoogleEnabled(false);
    const result = new URL(window.location.href).searchParams.get('authResult');
    const messages: Record<string, string> = { denied: 'Esta cuenta no tiene permiso para administrar.', cancelled: 'Se canceló el ingreso con Google.', invalid: 'El intento de ingreso venció. Intentá nuevamente.', failed: 'No pudimos validar tu cuenta. Intentá nuevamente.', expired: 'Tu sesión venció. Volvé a ingresar.' };
    if (result) { setGoogleMessage(messages[result] ?? 'El ingreso no está disponible.'); window.history.replaceState(null, '', '/admin/login'); }
    loadAdminLoginConfig().then(enabled => {
      if (!active) return;
      setGoogleEnabled(enabled);
      setConfigState(enabled ? 'enabled' : 'disabled');
      if (!enabled) setGoogleMessage('El acceso con Google todavía no está configurado.');
      else if (!result) setGoogleMessage('Usá tu cuenta de Google autorizada.');
    }).catch(() => {
      if (!active) return;
      setConfigState('error');
      setGoogleMessage('No pudimos consultar el acceso con Google. Intentá nuevamente.');
    });
    return () => { active = false; };
  }, [attempt]);
  return <section className="state"><div className="login-brand"><BrandMark variant="isologo" /></div><p className="eyebrow">Administración</p><h1>Ingresar al panel</h1><p>Ingresá para gestionar noticias, calendario y notificaciones.</p>
    <p role="status">{googleMessage}</p>
    <button type="button" disabled={!googleEnabled} onClick={() => window.location.assign('/admin/oauth/start')}>Continuar con Google</button>
    {(configState === 'error' || configState === 'disabled') && <button type="button" onClick={() => { setGoogleMessage('Consultando acceso con Google…'); setAttempt(value => value + 1); }}>Reintentar acceso</button>}

  </section>;
}
