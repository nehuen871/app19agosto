const key = 'utn-calendar-accepted';
const nativeAccepted = new Set<string>();
export function eventAccepted(id: string) {
  try { if (typeof localStorage !== 'undefined') { const values: unknown = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(values) && values.includes(id); } } catch { return false; }
  return nativeAccepted.has(id);
}
export function rememberEvent(id: string) {
  nativeAccepted.add(id);
  try {
    if (typeof localStorage !== 'undefined') {
      const previous: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      const ids = Array.isArray(previous) ? previous.filter((value): value is string => typeof value === 'string') : [];
      localStorage.setItem(key, JSON.stringify([...new Set([...ids, id])].slice(-1000)));
    }
  } catch { /* Local acceptance is still visible for this session. */ }
}
