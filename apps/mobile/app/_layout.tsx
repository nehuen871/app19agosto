/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles font assets through static require. */
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { brand, colors, typography, spacing } from '@utn/design-tokens';
import { BrandMark, LoadingIndicator } from '../components/ui';
const client = new QueryClient();

export default function Layout() {
  const [loaded, error] = useFonts({
    [brand.fonts.display]: require('../../../packages/brand-assets/fonts/ArchivoBlack-Regular.ttf'),
    [brand.fonts.body]: require('../../../packages/brand-assets/fonts/LibreFranklin-Regular.ttf'),
    [brand.fonts.bodySemibold]: require('../../../packages/brand-assets/fonts/LibreFranklin-SemiBold.ttf'),
  });
  if (error) return <View style={{ padding: spacing.lg, backgroundColor: colors.light.background }}><Text accessibilityRole="alert" style={{ color: colors.light.error }}>No pudimos cargar la presentación. Cerrá y volvé a abrir la app.</Text></View>;
  if (!loaded) return <LoadingIndicator title="Preparando la app…" />;
  return <QueryClientProvider client={client}>
    <StatusBar style="light" />
    <Stack screenOptions={{
      title: 'UTN FRBA', headerTitle: () => <BrandMark />, headerTitleAlign: 'left',
      headerStyle: { backgroundColor: colors.light.header }, headerTintColor: colors.light.headerForeground,
      headerTitleStyle: typography.label, contentStyle: { backgroundColor: colors.light.background },
    }} />
  </QueryClientProvider>;
}
