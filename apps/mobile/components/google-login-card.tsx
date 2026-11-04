import { apiUrl } from '../services/environment';
import { useQuery } from '@tanstack/react-query';
import { createAuthApiClient } from '@utn/api-client';
import { Body, Button, Card, Heading, LoadingIndicator, QueryNotice } from './ui';
import { useAuth } from '../services/auth';
const api = createAuthApiClient(apiUrl);
export function GoogleLoginCard() {
  const auth = useAuth();
  const config = useQuery({ queryKey: ['google-login-config'], queryFn: api.config });
  return <Card>
    <Heading level={2}>Ingresar con Google</Heading>
    <Body>Ingresá con tu cuenta de Google para acceder a las noticias, el calendario y tu cuenta.</Body>
    {!config.data ? config.fetchStatus === 'paused' ? <QueryNotice paused failed={false} onRetry={() => void config.refetch()} /> : config.isError ? <><Body>No pudimos consultar el acceso. Revisá tu conexión.</Body><Button title="Reintentar" onPress={() => void config.refetch()} /></> : <LoadingIndicator title="Consultando acceso con Google…" /> : <>
      <QueryNotice paused={config.fetchStatus === 'paused'} failed={config.isError} onRetry={() => void config.refetch()} />
      <Button title={auth.busy ? 'Ingresando…' : 'Continuar con Google'} disabled={!config.data.enabled || auth.busy} onPress={() => void auth.login(config.data)} />
      {!config.data.enabled && <Body>El login con Google todavía no está configurado.</Body>}
    </>}
  </Card>;
}
