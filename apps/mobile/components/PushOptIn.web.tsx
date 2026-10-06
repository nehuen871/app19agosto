import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Body, Button, styles } from './ui';
import { pushApi, pushStorageKey as storageKey } from '../services/push';
export function PushOptIn() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    try { setEnabled(Notification.permission === 'granted' && Boolean(localStorage.getItem(storageKey))); } catch { setEnabled(false); }
  }, []);
  async function toggle() {
    setBusy(true); setMessage('');
    try {
      if (enabled) {
        const stored = localStorage.getItem(storageKey);
        if (stored) await pushApi.unsubscribe(JSON.parse(stored));
        const registration = await navigator.serviceWorker.getRegistration('/');
        await (await registration?.pushManager.getSubscription())?.unsubscribe();
        localStorage.removeItem(storageKey); setEnabled(false); setMessage('Notificaciones desactivadas.');
      } else {
        // Permission is requested directly from the user's button gesture.
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { setMessage('Permiso no concedido. Podés cambiarlo desde la configuración del navegador.'); return; }
        const config = await pushApi.config();
        if (!config.enabled || !config.publicKey) throw new Error('El envío push todavía no está configurado.');
        const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        const key = Uint8Array.from(atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')), character => character.charCodeAt(0));
        const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const result = await pushApi.subscribe(subscription.toJSON());
        localStorage.setItem(storageKey, JSON.stringify(result));
        setEnabled(true); setMessage('Notificaciones activadas en este navegador.');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos configurar las notificaciones.'); }
    finally { setBusy(false); }
  }
  return <View style={styles.state}>
    {supported ? <Button title={busy ? 'Configurando…' : enabled ? 'Desactivar notificaciones' : 'Activar notificaciones'} disabled={busy} variant="secondary" onPress={() => { void toggle(); }} /> : <Body small>Las notificaciones requieren un navegador compatible y conexión HTTPS (localhost también funciona).</Body>}
    {message && <Body small>{message}</Body>}
  </View>;
}
