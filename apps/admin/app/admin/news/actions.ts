'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../services/admin-session';
export async function saveNews(previous: { error: string; saved: number; message: string }, data: FormData) {
  const api = await requireAdmin();
  const value = (name: string) => { const item = data.get(name); return typeof item === 'string' ? item : ''; };
  try {
    await api.createNews({ title: value('title'), slug: value('slug'), summary: value('summary'), content: value('content'), category: value('category'), coverImageUrl: value('coverImageUrl') || null, coverImageId: value('coverImageId') || null, featured: data.get('featured') === 'on', status: data.get('status') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT' });
  } catch (error) {
    return { ...previous, error: error instanceof Error ? error.message : 'No se pudo guardar la noticia.' };
  }
  revalidatePath('/admin');
  return { error: '', saved: previous.saved + 1, message: data.get('status') === 'PUBLISHED' ? 'Noticia publicada. Ya está disponible en la app.' : 'Noticia guardada como borrador.' };
}
export async function uploadNewsImage(data: FormData) {
  const api = await requireAdmin();
  const file = data.get('image');
  if (!(file instanceof File) || !['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) return { error: 'Elegí un PNG o JPEG de hasta 5 MB.', id: '' };
  try { const image = await api.uploadImage(file); return { id: image.id, error: '' }; }
  catch (error) { return { id: '', error: error instanceof Error ? error.message : 'No pudimos subir la imagen.' }; }
}
