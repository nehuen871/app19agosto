import { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { createAuthApiClient } from '@utn/api-client';
import { AppNavigation } from '../components/AppNavigation';
import { Body, Button, Card, Heading, LoadingIndicator, styles } from '../components/ui';
import { useAuth } from '../services/auth';
const api = createAuthApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1');
export default function AccountScreen() {
  const auth = useAuth(), [result, setResult] = useState('');
  const config = useQuery({ queryKey: ['google-login-config'], queryFn: api.config });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const url = new URL(window.location.href), code = url.searchParams.get('authResult');
    const messages: Record<string, string> = { 'signed-in': 'Ingresaste con Google.', denied: 'Este correo no está habilitado para ingresar a la app.', cancelled: 'Se canceló el ingreso con Google.', invalid: 'El intento de ingreso venció. Intentá nuevamente.', failed: 'No pudimos validar tu cuenta. Intentá nuevamente.', unavailable: 'El acceso con Google no está configurado.' };
    if (code) { setResult(messages[code] ?? 'No pudimos iniciar sesión.'); window.history.replaceState(null, '', '/account'); }
  }, []);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <AppNavigation current="account" /><Heading>Mi cuenta</Heading>
    {result ? <Body>{result}</Body> : null}
    {auth.error ? <View accessibilityRole="alert"><Body>{auth.error}</Body><Button title="Reintentar" onPress={() => void auth.refresh()} disabled={auth.busy} /></View> : null}
    {auth.busy ? <LoadingIndicator title="Consultando tu cuenta…" /> : auth.user ? <Card><Heading level={2}>{auth.user.name}</Heading><Body>{auth.user.email}</Body><Button title="Cerrar sesión" variant="secondary" onPress={() => void auth.logout()} /></Card> : <Card>
      <Heading level={2}>Ingresar con Google</Heading><Body>Usá tu cuenta habilitada para iniciar sesión en 19 de Agosto.</Body>
      {config.isPending ? <LoadingIndicator title="Consultando acceso con Google…" /> : config.isError ? <><Body>No pudimos consultar el acceso. Revisá tu conexión.</Body><Button title="Reintentar" onPress={() => void config.refetch()} /></> : <><Button title="Continuar con Google" disabled={!config.data.enabled} onPress={() => void auth.login(config.data)} />{!config.data.enabled ? <Body>El login con Google todavía no está configurado.</Body> : null}</>}
    </Card>}
  </ScrollView>;
}
