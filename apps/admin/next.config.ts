import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', outputFileTracingRoot: process.cwd() + '/../..', allowedDevOrigins: ['admin'], transpilePackages: ['@utn/api-client', '@utn/design-tokens'], };
export default config;
