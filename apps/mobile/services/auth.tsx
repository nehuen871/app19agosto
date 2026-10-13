import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { AuthRequestError, createAuthApiClient, type AuthUser, type GoogleLoginConfig } from '@utn/api-client';

const api = createAuthApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1');
const storageKey = 'utn.google.session';
const returnUrl = 'utnfrba://account';
type AuthState = { user: AuthUser | null; busy: boolean; error: string; refresh: () => Promise<void>; login: (config: GoogleLoginConfig) => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
function base64url(bytes: Uint8Array) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let output = '', bits = 0, value = 0;
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 6) { bits -= 6; output += alphabet[(value >>> bits) & 63]; } }
  if (bits) output += alphabet[(value << (6 - bits)) & 63];
  return output;
}
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null), [token, setToken] = useState<string | null>(null), [busy, setBusy] = useState(true), [error, setError] = useState('');
  async function refresh() {
    setBusy(true); setError('');
    try {
      const saved = Platform.OS === 'web' ? null : await SecureStore.getItemAsync(storageKey);
      setToken(saved);
      const session = await api.me(saved); setUser(session.user);
    } catch (cause) {
      if (cause instanceof AuthRequestError && cause.status === 401) {
        setUser(null); setToken(null);
        if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(storageKey);
      } else setError('No pudimos consultar tu sesión. Revisá tu conexión y reintentá.');
    } finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function login(config: GoogleLoginConfig) {
    if (!config.startUrl || !config.enabled) return;
    setBusy(true); setError('');
    try {
      if (Platform.OS === 'web') { window.location.assign(config.startUrl); return; }
      const verifier = base64url(await Crypto.getRandomBytesAsync(32)), state = base64url(await Crypto.getRandomBytesAsync(32));
      const challenge = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const url = new URL(config.startUrl); url.searchParams.set('nativeChallenge', challenge); url.searchParams.set('nativeState', state);
      const result = await WebBrowser.openAuthSessionAsync(url.href, returnUrl);
      if (result.type !== 'success') { setError('Se canceló el ingreso con Google.'); return; }
      const incoming = new URL(result.url);
      if (incoming.protocol !== 'utnfrba:' || incoming.hostname !== 'account' || incoming.searchParams.get('nativeState') !== state || incoming.searchParams.get('authResult') !== 'signed-in') { setError('No pudimos autorizar esta cuenta. Intentá nuevamente.'); return; }
      const ticket = incoming.searchParams.get('ticket'); if (!ticket) throw new Error('ticket');
      const session = await api.exchange(ticket, verifier);
      await SecureStore.setItemAsync(storageKey, session.token);
      setToken(session.token); setUser(session.user);
    } catch { setError('No pudimos iniciar sesión. Revisá tu conexión e intentá nuevamente.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await api.logout(token); if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(storageKey); setToken(null); setUser(null); }
    catch { setError('No pudimos cerrar la sesión. Revisá tu conexión y reintentá.'); }
    finally { setBusy(false); }
  }
  return <AuthContext.Provider value={{ user, busy, error, refresh, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider required'); return value; }
