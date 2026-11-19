/* global process */
import metroConfig from 'expo/metro-config.js';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createMobileApiProxy } from '../../scripts/mobile-api-proxy.mjs';

const config = metroConfig.getDefaultConfig(dirname(fileURLToPath(import.meta.url)));
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const metro = enhance ? enhance(middleware, server) : middleware;
  const api = createMobileApiProxy(process.env.API_INTERNAL_URL ?? 'http://localhost:4000');
  return (req, res, next) => {
    const path = (req.url ?? '').split('?')[0];
    if (path === '/health/live' || path === '/api' || path.startsWith('/api/')) return api(req, res, next);
    return metro(req, res, next);
  };
};
export default config;
