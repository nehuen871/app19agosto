import type { Category, News, Page, Notification, NotificationDraft } from '@utn/types';

export function createApiClient(baseUrl: string) {
  async function get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('No se pudo cargar la información. Intentá nuevamente.');
      }
      return await response.json() as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    news: (page = 1) => get<Page<News>>(`/news?page=${page}`),
    detail: (slug: string) => get<News>(`/news/${encodeURIComponent(slug)}`),
    categories: () => get<Category[]>('/categories'),
  };
}

export type { News } from '@utn/types';

// Only call this client from the admin server; credentials never reach client JS.
export function createAdminApiClient(baseUrl: string, accessToken: string) {
  async function request<T>(path: string, payload?: NotificationDraft): Promise<T> {
    const response = await fetch(`${baseUrl}/admin/notifications${path}`, {
      method: payload ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (response.status === 400) throw new Error('Revisá el título, el mensaje y la noticia elegida.');
      throw new Error('No se pudo completar la solicitud. Intentá nuevamente.');
    }
    return response.json() as Promise<T>;
  }
  return {
    notifications: (page = 1) => request<Page<Notification>>(`?page=${page}`),
    createNotification: (data: NotificationDraft) => request<Notification>('', data),
  };
}
