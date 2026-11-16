export async function loadAdminLoginConfig(fetcher: typeof fetch = fetch) {
  const response = await fetcher('/admin/oauth/config', {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('No pudimos consultar el acceso con Google. Intentá nuevamente.');
  const config: unknown = await response.json();
  if (!config || typeof config !== 'object' || !('enabled' in config) || typeof config.enabled !== 'boolean') {
    throw new Error('La configuración de ingreso no es válida. Intentá nuevamente.');
  }
  return config.enabled;
}
