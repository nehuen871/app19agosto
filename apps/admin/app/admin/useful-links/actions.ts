'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../services/admin-session';
export async function saveUsefulLink(id: string | null, version: string | null, previous: { error: string; saved: number }, data: FormData) {
  const value = (name: string) => { const value = data.get(name); return typeof value === 'string' ? value : ''; };
  try {
    const api = await requireAdmin('action');
    const input = { title: value('title'), description: value('description'), url: value('url'), imageId: value('imageId'), priority: Number(value('priority')), featured: data.get('featured') === 'on', published: data.get('published') === 'on' };
    if (id && version) await api.updateUsefulLink(id, input, version); else await api.createUsefulLink(input);
  } catch (error) { return { ...previous, error: error instanceof Error ? error.message : 'No pudimos guardar el enlace.' }; }
  revalidatePath('/admin/useful-links');
  return { error: '', saved: previous.saved + 1 };
}
export async function deleteUsefulLink(id: string, version: string, _previous: { error: string }) {
  try { const api = await requireAdmin('action'); await api.deleteUsefulLink(id, version); }
  catch (error) { return { error: error instanceof Error ? error.message : 'No pudimos eliminar el enlace.' }; }
  revalidatePath('/admin/useful-links');
  return { error: '' };
}
