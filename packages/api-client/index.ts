export * from './session';
export { decodeRich, encodeRich, richText, richPlain, plainDocument, validateRichDocument, safeRichLink, richLimit, richContentLimit, richPrefix, richStorageLimit, richContentStorageLimit, type RichNode, type RichMark } from '@utn/types';
import type { Category, News, Page, Notification, NotificationDraft, NewsInput, NewsUpdateInput, AdminNews, CalendarEvent, EventInput, MediaImage } from '@utn/types';
export * from './calendar';
export * from './categories';
export * from './auth';
export type { Category, CalendarEvent, EventInput, EventColor, Notification } from '@utn/types';

export function createApiClient(baseUrl: string, options: { fetcher?: typeof fetch; token?: string } = {}) {
  function cover(news: News): News {
    return news.coverImageUrl?.startsWith('/api/v1/media/') && /^https?:\/\//.test(baseUrl) ? { ...news, coverImageUrl: new URL(news.coverImageUrl, baseUrl).href } : news;
  }
  async function get<T>(path: string, signal?: AbortSignal, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await (options.fetcher ?? fetch)(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        cache: 'no-store', credentials: 'include',
        headers,
      });
      if (!response.ok) {
        throw new Error('No se pudo cargar la información. Intentá nuevamente.');
      }
      return await response.json() as T;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  return {
    news: async (page = 1, signal?: AbortSignal, filters: { category?: string; featured?: boolean; limit?: number } = {}) => {
      const query = new URLSearchParams({ page: String(page) });
      if (filters.category) query.set('category', filters.category);
      if (filters.featured !== undefined) query.set('featured', String(filters.featured));
      if (filters.limit !== undefined) query.set('limit', String(filters.limit));
      const data = await get<Page<News>>(`/news?${query}`, signal);
      return { ...data, items: data.items.map(cover) };
    },
    detail: async (slug: string, signal?: AbortSignal) => cover(await get<News>(`/news/${encodeURIComponent(slug)}`, signal)),
    categories: (signal?: AbortSignal) => get<Category[]>('/categories', signal),
    events: (month: string, page = 1, signal?: AbortSignal) => get<Page<CalendarEvent>>(`/events?month=${encodeURIComponent(month)}&page=${page}`, signal),
    authorizeCalendar: (eventId: string) => get<{ startUrl: string }>('/google-calendar/authorize', undefined, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) }),
    googleCalendarConfig: (signal?: AbortSignal) => get<{ enabled: boolean; startUrl: string | null }>('/google-calendar/config', signal),
  };
}

export type { AdminNews, NewsUpdateInput } from '@utn/types';
export type { News } from '@utn/types';

// Only call this client from the admin server; credentials never reach client JS.
export function createAdminApiClient(baseUrl: string, accessToken: string) {
  async function request<T>(path: string, payload?: { name: string; parentId?: string | null } | { published: boolean } | NotificationDraft | NewsInput | NewsUpdateInput | EventInput | Record<string, never>, resource = 'notifications', method = payload ? 'POST' : 'GET'): Promise<T> {
    const response = await fetch(`${baseUrl}/admin/${resource}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (resource === 'categories') {
        const data = await response.json().catch(() => ({})) as { error?: { code?: string } };
        if (data.error?.code === 'CATEGORY_EXISTS') throw new Error('Ya existe una categoría con ese nombre.');
        if (data.error?.code === 'CATEGORY_IN_USE') throw new Error('Esta categoría tiene noticias o subcategorías asociadas. Reasignalas antes de eliminarla.');
        if (data.error?.code === 'INVALID_PARENT') throw new Error('Elegí una categoría superior válida. Una categoría no puede depender de sí misma ni de sus descendientes.');
        if (response.status === 404) throw new Error('La categoría ya no existe. Actualizá el listado.');
        if (response.status === 400) throw new Error('Ingresá un nombre de categoría de hasta 100 caracteres.');
        throw new Error('No se pudo completar la solicitud de categorías. Intentá nuevamente.');
      }
      if (path.endsWith('/send')) {
        const data = await response.json().catch(() => ({})) as { error?: { code?: string } };
        if (data.error?.code === 'NO_RECIPIENTS') throw new Error('No hay dispositivos suscriptos. Activá notificaciones en la app.');
        if (data.error?.code === 'ALREADY_SENT') throw new Error('Esta notificación ya fue enviada o está en proceso.');
        throw new Error('No se pudo iniciar el envío. Revisá la configuración e intentá nuevamente.');
      }
      if (response.status === 409) throw new Error('No se pudo guardar la noticia. Intentá nuevamente.');
      if (response.status === 400) throw new Error(resource === 'news' ? 'Revisá el título, categoría, resumen, contenido e imagen.' : resource === 'events' ? 'Revisá el título, las fechas, el color y el estado del evento.' : 'Revisá el título, el mensaje y la noticia elegida.');
      throw new Error('No se pudo completar la solicitud. Intentá nuevamente.');
    }
    return response.json() as Promise<T>;
  }
  return {
    categories: (page = 1, limit = 20) => request<Page<Category & { _count: { news: number; children: number } }>>(`?page=${page}&limit=${limit}`, undefined, 'categories'),
    categoryChoices: () => createApiClient(baseUrl, { token: accessToken }).categories(),
    createCategory: (name: string, parentId: string | null = null) => request<Category>('', { name, parentId }, 'categories'),
    updateCategory: (id: string, name: string, parentId?: string | null) => request<Category>(`/${encodeURIComponent(id)}`, { name, ...(parentId !== undefined ? { parentId } : {}) }, 'categories', 'PATCH'),
    deleteCategory: (id: string) => request<{ deleted: boolean }>(`/${encodeURIComponent(id)}`, undefined, 'categories', 'DELETE'),
    publishedNews: () => createApiClient(baseUrl, { token: accessToken }).news(),
    events: (page = 1) => request<Page<CalendarEvent>>(`?page=${page}`, undefined, 'events'),
    createEvent: (data: EventInput) => request<CalendarEvent>('', data, 'events'),
    updateEvent: (id: string, data: EventInput) => request<CalendarEvent>(`/${encodeURIComponent(id)}`, data, 'events', 'PATCH'),
    uploadImage: async (file: File): Promise<MediaImage> => {
      const response = await fetch(`${baseUrl}/admin/media`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': file.type }, body: await file.arrayBuffer(), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('No pudimos subir la imagen. Usá PNG o JPEG de hasta 5 MB y 4096 px / 12 megapíxeles.');
      return response.json();
    },
    news: (page = 1) => request<Page<AdminNews>>(`?page=${page}`, undefined, 'news'),
    createNews: (data: NewsInput) => request<AdminNews>('', data, 'news'),
    setNewsVisibility: (id: string, published: boolean) => request<AdminNews>(`/${encodeURIComponent(id)}/visibility`, { published }, 'news', 'PATCH'),
    updateNews: (id: string, data: NewsUpdateInput) => request<AdminNews>(`/${encodeURIComponent(id)}`, data, 'news', 'PATCH'),
    sendNotification: (id: string) => request<Notification>(`/${encodeURIComponent(id)}/send`, {}),
    notifications: (page = 1) => request<Page<Notification>>(`?page=${page}`),
    createNotification: (data: NotificationDraft) => request<Notification>('', data),
  };
}
