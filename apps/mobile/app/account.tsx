import { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ProfileForm } from '../components/profile-form';
import { PushOptIn } from '../components/PushOptIn';
import { GoogleLoginCard } from '../components/google-login-card';
import { BottomNavigation } from '../components/bottom-navigation';
import { Avatar, Badge, Body, Button, Heading, LoadingIndicator, Text, useScreenContentStyle, styles } from '../components/ui';
import { newsStyles } from '../components/news-styles';
import { editorialStyles } from '../components/editorial-styles';
import { useAuth } from '../services/auth';
export default function AccountScreen() {
  const contentStyle = useScreenContentStyle();
  const auth = useAuth(), [result, setResult] = useState(''), [editing, setEditing] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const url = new URL(window.location.href), code = url.searchParams.get('authResult');
    const messages: Record<string, string> = { 'signed-in': 'Ingresaste con Google.', denied: 'Este correo no está habilitado para ingresar a la app.', cancelled: 'Se canceló el ingreso con Google.', invalid: 'El intento de ingreso venció. Intentá nuevamente.', failed: 'No pudimos validar tu cuenta. Intentá nuevamente.', unavailable: 'El acceso con Google no está configurado.' };
    if (code) { setResult(messages[code] ?? 'No pudimos iniciar sesión.'); window.history.replaceState(null, '', '/account'); }
  }, []);
  useEffect(() => {
    if (result === 'Ingresaste con Google.' && auth.user) router.replace('/');
  }, [result, auth.user]);
  return <View style={newsStyles.page}><ScrollView style={newsStyles.page} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={contentStyle}>
    {auth.user ? <View style={newsStyles.introduction}><Text style={newsStyles.eyebrow}>Tu espacio en la comunidad</Text><Heading style={newsStyles.screenTitle}>Todo en su lugar.</Heading></View> : <Heading>Bienvenido a 19 de Agosto</Heading>}
    {result ? <Body>{result}</Body> : null}
    {auth.error ? <View accessibilityRole="alert" style={styles.notice}><Body>{auth.error}</Body><Button title="Reintentar" onPress={() => void auth.refresh()} disabled={auth.busy} /></View> : null}
    {auth.busy && !auth.user ? <LoadingIndicator title="Consultando tu cuenta…" /> : auth.user ? <>
      <View style={editorialStyles.section}><View style={editorialStyles.identity}><Avatar name={auth.user.name} /><View style={editorialStyles.identityCopy}><Heading level={2} style={editorialStyles.name}>{auth.user.name}</Heading><Body small>{auth.user.email}</Body></View></View><View style={editorialStyles.row}><Badge featured>Correo verificado por Google</Badge></View></View>
      <View style={editorialStyles.disclosure}><Button title={editing ? 'Mis datos −' : 'Mis datos +'} variant="ghost" accessibilityState={{ expanded: editing }} style={editorialStyles.disclosureButton} onPress={() => setEditing(!editing)} /><View style={!editing && editorialStyles.collapsed} accessibilityElementsHidden={!editing} importantForAccessibility={editing ? 'auto' : 'no-hide-descendants'}><ProfileForm key={auth.user.id} initialName={auth.user.name} /></View></View>
      <View style={editorialStyles.panel}><PushOptIn variant="embedded" /></View>
      <Body small muted>Acceso con tu cuenta institucional de Google.</Body>
      <Button title={auth.busy ? 'Cerrando sesión…' : 'Cerrar sesión'} variant="ghost" loading={auth.busy} disabled={auth.busy} onPress={() => void auth.logout()} />
    </> : <GoogleLoginCard />}
  </ScrollView>{auth.user && <BottomNavigation current="account" />}</View>;
}
