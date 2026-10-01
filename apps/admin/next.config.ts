import type { NextConfig } from 'next';
const config: NextConfig = { allowedDevOrigins: ['admin'], transpilePackages: ['@utn/api-client', '@utn/design-tokens'], };
export default config;
