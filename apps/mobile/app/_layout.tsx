/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles font assets through static require. */
import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, Platform, Text, View } from 'react-native';
import { brand, colors, typography, spacing } from '@utn/design-tokens';
import { BrandMark, styles } from '../components/ui';
import { AccountMenu } from '../components/account-menu';
import { AuthProvider, useAuth } from '../services/auth';
const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 2 } } });

export default function Layout() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => focusManager.setFocused(state === 'active'));
    return () => { subscription.remove(); focusManager.setFocused(undefined); };
  }, []);
  const [loaded, error] = useFonts({
    [brand.fonts.display]: require('../../../packages/brand-assets/fonts/ArchivoBlack-Regular.ttf'),
    [brand.fonts.body]: require('../../../packages/brand-assets/fonts/LibreFranklin-Regular.ttf'),
    [brand.fonts.accent]: require('../../../packages/brand-assets/fonts/LibreBaskerville-Variable.ttf'),
    [brand.fonts.headingAlt]: require('../../../packages/brand-assets/fonts/Archivo-Variable.ttf'),
    [brand.fonts.bodySemibold]: require('../../../packages/brand-assets/fonts/LibreFranklin-SemiBold.ttf'),
  });
  if (error) return <View style={{ padding: spacing.lg, backgroundColor: colors.light.background }}><Text accessibilityRole="alert" style={{ color: colors.light.error }}>No pudimos cargar la presentación. Cerrá y volvé a abrir la app.</Text></View>;
  if (!loaded) return <View style={styles.launch}><StatusBar style="light" /><BrandMark variant="isologo" /><ActivityIndicator color={colors.light.headerForeground} accessibilityLabel="Preparando la app…" /></View>;
  return <QueryClientProvider client={client}><AuthProvider>
    <StatusBar style="light" />
    <AppStack />
  </AuthProvider></QueryClientProvider>;
}

function AppStack() {
  const auth = useAuth();
  if (!auth.ready) return <View style={styles.launch}><BrandMark variant="isologo" /><ActivityIndicator color={colors.light.headerForeground} accessibilityLabel="Verificando tu sesión…" /></View>;
  return (
    <Stack screenOptions={{
      headerLeft: auth.user ? () => <AccountMenu /> : undefined, headerBackVisible: true,
      title: 'UTN FRBA', headerTitle: () => <BrandMark />, headerTitleAlign: 'left',
      headerStyle: { backgroundColor: colors.light.header }, headerTintColor: colors.light.headerForeground,
      headerTitleStyle: typography.label, contentStyle: { backgroundColor: colors.light.background },
    }}>
      <Stack.Protected guard={Boolean(auth.user)}>
      <Stack.Screen name="index" options={{ title: 'Noticias', headerTitle: 'Noticias', animation: 'none' }} />
      <Stack.Screen name="calendar" options={{ title: 'Calendario', headerTitle: 'Calendario', animation: 'none' }} />
      <Stack.Screen name="news/[slug]" options={{ title: 'Noticia', headerTitle: 'Noticia' }} />
      </Stack.Protected>
      <Stack.Screen name="account" options={{ title: auth.user ? 'Mi cuenta' : 'Ingresar', headerTitle: auth.user ? 'Mi cuenta' : 'Ingresar', animation: 'none' }} />
    </Stack>
  );
}
