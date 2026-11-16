import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiUrl } from './environment';
import { session } from './session';
import type { PushCapability } from './push';

const storageKey = 'utn.expo-push.v1';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
export async function nativePushEnabled() { return (await Notifications.getPermissionsAsync()).granted && Boolean(await SecureStore.getItemAsync(storageKey)); }
export async function enableNativePush() {
  if (Constants.appOwnership === 'expo') throw new Error('Para recibir notificaciones instalá una compilación de la app; Expo Go no es compatible.');
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (typeof projectId !== 'string' || !projectId) throw new Error('Las notificaciones todavía no están habilitadas en esta versión de la app.');
  const response = await fetch(apiUrl + '/push/native/config', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('No pudimos consultar las notificaciones. Intentá nuevamente.');
  const config = await response.json();
  if (!config.enabled || config.projectId !== projectId) throw new Error('Las notificaciones todavía no están habilitadas en el servidor.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('news', { name: 'Noticias', importance: Notifications.AndroidImportance.HIGH });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Permiso no concedido. Podés cambiarlo desde la configuración del celular.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const registered = await session.fetch(apiUrl + '/push/native/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'expo', token, projectId }), signal: AbortSignal.timeout(15000) });
  if (!registered.ok) throw new Error('No pudimos activar las notificaciones. Intentá nuevamente.');
  const capability = await registered.json() as PushCapability;
  await SecureStore.setItemAsync(storageKey, JSON.stringify(capability));
}
export async function disableNativePush() {
  const stored = await SecureStore.getItemAsync(storageKey);
  if (!stored) return;
  const response = await fetch(apiUrl + '/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stored, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('No pudimos desactivar las notificaciones. Intentá nuevamente.');
  await SecureStore.deleteItemAsync(storageKey);
}
