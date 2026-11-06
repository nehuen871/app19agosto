import { session as appSession } from './session';
import { apiUrl } from './environment';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { AuthRequestError, createAuthApiClient, type AuthUser, type GoogleLoginConfig } from '@utn/api-client';

const api = createAuthApiClient(apiUrl, 'APP', appSession.fetch);
const returnUrl = 'utnfrba://account';
type AuthState = { user: AuthUser | null; ready: boolean; busy: boolean; error: string; refresh: () => Promise<void>; login: (config: GoogleLoginConfig) => Promise<void>; logout: () => Promise<boolean>; updateProfile: (name: string) => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
function base64url(bytes: Uint8Array) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let output = '', bits = 0, value = 0;
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 6) { bits -= 6; output += alphabet[(value >>> bits) & 63]; } }
  if (bits) output += alphabet[(value << (6 - bits)) & 63];
  return output;
}
export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionGeneration = useRef(0);
  function clearAppCache() { queryClient.clear(); }
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null), [busy, setBusy] = useState(true), [error, setError] = useState('');
  async function refresh() {
    setBusy(true); setError('');
    try {
      const session = await api.me(); setUser(session.user);
    } catch (cause) {
      if (cause instanceof AuthRequestError && cause.status === 401) {
        sessionGeneration.current++; setUser(null); clearAppCache();

      } else setError('No pudimos consultar tu sesión. Revisá tu conexión y reintentá.');
    } finally { setReady(true); setBusy(false); }
  }
  useEffect(() => appSession.subscribe(() => { sessionGeneration.current++; setUser(null); clearAppCache(); }), []);
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
      await appSession.setCredentials({ token: session.token, refreshToken: session.refreshToken });
      setUser(session.user); router.replace('/');
    } catch { setError('No pudimos iniciar sesión. Revisá tu conexión e intentá nuevamente.'); }
    finally { setBusy(false); }
  }
  async function updateProfile(name: string) {
    const generation = sessionGeneration.current;
    const result = await api.updateProfile(name);
    if (generation !== sessionGeneration.current || result.user.id !== user?.id) throw new Error('La sesión cambió. Volvé a ingresar antes de guardar.');
    setUser(result.user);
  }
  async function logout() {
    setBusy(true); setError('');
    try { const credentials = await appSession.credentials(); await api.logout(undefined, credentials?.refreshToken); await appSession.clear(); sessionGeneration.current++; setUser(null); clearAppCache(); return true; }
    catch { setError('No pudimos cerrar la sesión. Revisá tu conexión y reintentá.'); return false; }
    finally { setBusy(false); }
  }
  return <AuthContext.Provider value={{ user, ready, busy, error, refresh, login, logout, updateProfile }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider required'); return value; }
