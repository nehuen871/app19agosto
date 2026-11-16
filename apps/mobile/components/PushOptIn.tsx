import { View } from 'react-native';
import { useEffect, useState } from 'react';
import { Body, Button, Heading, styles } from './ui';
import { disableNativePush, enableNativePush, nativePushEnabled } from '../services/native-push';
export function PushOptIn({ variant = 'panel' }: { variant?: 'panel' | 'embedded' }) {
  const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(true), [message, setMessage] = useState('');
  useEffect(() => { let active = true; nativePushEnabled().then(value => { if (active) setEnabled(value); }).catch(() => { if (active) setMessage('No pudimos consultar las notificaciones.'); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, []);
  async function toggle() {
    setBusy(true); setMessage('');
    try { if (enabled) await disableNativePush(); else await enableNativePush(); setEnabled(!enabled); setMessage(enabled ? 'Notificaciones desactivadas.' : 'Notificaciones activadas en este celular.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos configurar las notificaciones.'); }
    finally { setBusy(false); }
  }
  return <View style={[styles.preferencePanel, variant === 'embedded' && styles.preferenceEmbedded]}><View style={styles.preferenceText}><Heading level={3}>Notificaciones</Heading><Body small muted>Recibí avisos de nuevas publicaciones.</Body></View>
    <Button size="sm" variant="secondary" loading={busy} disabled={busy} title={enabled ? 'Desactivar notificaciones' : 'Activar notificaciones'} onPress={() => void toggle()} />
    {message ? <Body small>{message}</Body> : null}
  </View>;
}
