import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', outputFileTracingRoot: process.cwd() + '/../..', allowedDevOrigins: ['admin'], transpilePackages: ['@utn/api-client', '@utn/design-tokens'], experimental: { serverActions: { bodySizeLimit: '6mb' } } };
export default config;
