'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../services/admin-session';
export async function saveCategory(id: string | null, previous: { error: string; message: string; saved: number }, data: FormData) {
  try {
    const api = await requireAdmin('action');
    const name = data.get('name');
    const parent = data.get('parentId');
    const parentId = typeof parent === 'string' && parent ? parent : null;
    if (typeof name !== 'string') return { ...previous, error: 'Ingresá un nombre.' };
    if (id) await api.updateCategory(id, name, parentId); else await api.createCategory(name, parentId);
  } catch (error) { return { ...previous, error: error instanceof Error ? error.message : 'No pudimos guardar la categoría.', message: '' }; }
  revalidatePath('/admin/categories'); revalidatePath('/admin');
  return { error: '', message: id ? 'Categoría actualizada.' : 'Categoría creada.', saved: previous.saved + 1 };
}
export async function deleteCategory(id: string, _previous: { error: string; message: string }) {
  try { const api = await requireAdmin('action'); await api.deleteCategory(id); }
  catch (error) { return { error: error instanceof Error ? error.message : 'No pudimos eliminar la categoría.', message: '' }; }
  revalidatePath('/admin/categories'); revalidatePath('/admin');
  return { error: '', message: 'Categoría eliminada.' };
}
