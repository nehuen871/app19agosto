import type { Category, News, Page, Notification, NotificationDraft, NewsInput, AdminNews } from '@utn/types';

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
  async function request<T>(path: string, payload?: NotificationDraft | NewsInput | Record<string, never>, resource = 'notifications'): Promise<T> {
    const response = await fetch(`${baseUrl}/admin/${resource}${path}`, {
      method: payload ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (path.endsWith('/send')) {
        const data = await response.json().catch(() => ({})) as { error?: { code?: string } };
        if (data.error?.code === 'NO_RECIPIENTS') throw new Error('No hay dispositivos suscriptos. Activá notificaciones en la app.');
        if (data.error?.code === 'ALREADY_SENT') throw new Error('Esta notificación ya fue enviada o está en proceso.');
        throw new Error('No se pudo iniciar el envío. Revisá la configuración e intentá nuevamente.');
      }
      if (response.status === 409) throw new Error('Ya existe una noticia con ese identificador. Elegí otro.');
      if (response.status === 400) throw new Error(resource === 'news' ? 'Revisá el título, identificador, categoría, resumen, contenido e imagen.' : 'Revisá el título, el mensaje y la noticia elegida.');
      throw new Error('No se pudo completar la solicitud. Intentá nuevamente.');
    }
    return response.json() as Promise<T>;
  }
  return {
    news: (page = 1) => request<Page<AdminNews>>(`?page=${page}`, undefined, 'news'),
    createNews: (data: NewsInput) => request<AdminNews>('', data, 'news'),
    sendNotification: (id: string) => request<Notification>(`/${encodeURIComponent(id)}/send`, {}),
    notifications: (page = 1) => request<Page<Notification>>(`?page=${page}`),
    createNotification: (data: NotificationDraft) => request<Notification>('', data),
  };
}
