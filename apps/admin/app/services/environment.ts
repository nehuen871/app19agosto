import 'server-only';
export const apiUrl = (process.env.API_URL ?? 'http://api:4000/api/v1').replace(/\/+$/, '');
