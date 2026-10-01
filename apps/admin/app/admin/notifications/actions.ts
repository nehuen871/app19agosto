'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../services/admin-session';
export type FormState = {
  error: string; saved: number;
};
export async function saveNotification(previous: FormState, data: FormData): Promise<FormState> {
  const api = await requireAdmin();
  const title = data.get('title'), body = data.get('body'), newsId = data.get('newsId');
  const next = { ...previous };
  if (typeof title !== 'string' || typeof body !== 'string' || (newsId !== null && typeof newsId !== 'string')) return { ...next, error: 'Completá los campos del formulario.' };
  try {
    await api.createNotification({ title, body, newsId: newsId || null });
  } catch (error) {
    return { ...next, error: error instanceof Error ? error.message : 'No se pudo guardar. Intentá nuevamente.' };
  }
  revalidatePath('/admin/notifications');
  return { ...next, error: '', saved: previous.saved + 1 };
}
