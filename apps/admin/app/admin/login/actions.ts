'use server';
import { redirect } from 'next/navigation';
import { startAdminSession, endAdminSession } from '../../services/admin-session';
export async function login(_previous: { error: string }, data: FormData) {
  try {
    const key = data.get('key');
    if (typeof key !== 'string' || key.length > 256 || !await startAdminSession(key)) return { error: 'Clave de acceso inválida.' };
  } catch { return { error: 'El acceso administrativo no está configurado.' }; }
  redirect('/admin');
}
export async function logout() {
  await endAdminSession();
  redirect('/admin/login');
}
