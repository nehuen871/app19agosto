import { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ProfileForm } from '../components/profile-form';
import { GoogleLoginCard } from '../components/google-login-card';
import { AppNavigation } from '../components/AppNavigation';
import { Avatar, Body, Button, Card, CardHeader, CardFooter, Heading, LoadingIndicator, useScreenContentStyle, styles } from '../components/ui';
import { useAuth } from '../services/auth';
export default function AccountScreen() {
  const contentStyle = useScreenContentStyle();
  const auth = useAuth(), [result, setResult] = useState('');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const url = new URL(window.location.href), code = url.searchParams.get('authResult');
    const messages: Record<string, string> = { 'signed-in': 'Ingresaste con Google.', denied: 'Este correo no está habilitado para ingresar a la app.', cancelled: 'Se canceló el ingreso con Google.', invalid: 'El intento de ingreso venció. Intentá nuevamente.', failed: 'No pudimos validar tu cuenta. Intentá nuevamente.', unavailable: 'El acceso con Google no está configurado.' };
    if (code) { setResult(messages[code] ?? 'No pudimos iniciar sesión.'); window.history.replaceState(null, '', '/account'); }
  }, []);
  useEffect(() => {
    if (result === 'Ingresaste con Google.' && auth.user) router.replace('/');
  }, [result, auth.user]);
  return <ScrollView style={styles.page} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={contentStyle}>
    <>{auth.user && <AppNavigation current="account" />}</><Heading>{auth.user ? 'Mi cuenta' : 'Bienvenido a 19 de Agosto'}</Heading>
    {result ? <Body>{result}</Body> : null}
    {auth.error ? <View accessibilityRole="alert" style={styles.notice}><Body>{auth.error}</Body><Button title="Reintentar" onPress={() => void auth.refresh()} disabled={auth.busy} /></View> : null}
    {auth.busy && !auth.user ? <LoadingIndicator title="Consultando tu cuenta…" /> : auth.user ? <Card><CardHeader><Avatar name={auth.user.name} /><Heading level={2}>{auth.user.name}</Heading><Body small muted>{auth.user.email}</Body></CardHeader><CardFooter><Button title="Ver noticias" onPress={() => router.replace('/')} /><ProfileForm key={auth.user.id} initialName={auth.user.name} /></CardFooter></Card> : <GoogleLoginCard />}
  </ScrollView>;
}
