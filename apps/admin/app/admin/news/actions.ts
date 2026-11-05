'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../services/admin-session';
export async function saveNews(id: string | null, previous: { error: string; saved: number; message: string }, data: FormData) {
  const value = (name: string) => { const item = data.get(name); return typeof item === 'string' ? item : ''; };
  try {
    const api = await requireAdmin('action');
    const input = { title: value('title'), slug: value('slug'), summary: value('summary'), content: value('content'), category: value('category'), coverImageUrl: value('coverImageUrl') || null, coverImageId: value('coverImageId') || null, featured: data.get('featured') === 'on' };
    if (id) await api.updateNews(id, { ...input, status: value('status') === 'PUBLISHED' ? 'PUBLISHED' : value('status') === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT' });
    else await api.createNews({ ...input, status: value('status') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT' });
  } catch (error) {
    return { ...previous, error: error instanceof Error ? error.message : 'No se pudo guardar la noticia.' };
  }
  revalidatePath('/admin');
  return { error: '', saved: previous.saved + 1, message: id ? 'Cambios guardados.' : data.get('status') === 'PUBLISHED' ? 'Noticia publicada. Ya está disponible en la app.' : 'Noticia guardada como borrador.' };
}
export async function uploadNewsImage(data: FormData) {
  const file = data.get('image');
  if (!(file instanceof File) || !['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) return { error: 'Elegí un PNG o JPEG de hasta 5 MB.', id: '' };
  try { const api = await requireAdmin('action'); const image = await api.uploadImage(file); return { id: image.id, error: '' }; }
  catch (error) { return { id: '', error: error instanceof Error ? error.message : 'No pudimos subir la imagen.' }; }
}

export async function setNewsVisibility(id: string, published: boolean, _previous: { error: string; message: string }) {
  try {
    const api = await requireAdmin('action');
    await api.setNewsVisibility(id, published);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo cambiar la visibilidad.', message: '' };
  }
  revalidatePath('/admin');
  return { error: '', message: published ? 'Noticia publicada en la app.' : 'Noticia oculta en la app.' };
}
