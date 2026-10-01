import type { Category, News, Page } from '@utn/types';

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
