export function notificationPath(value: unknown): '/' | `/news/${string}` {
  return typeof value === 'string' && /^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value as `/news/${string}` : '/';
}
