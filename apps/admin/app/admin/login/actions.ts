'use server';
import { redirect } from 'next/navigation';
import { endAdminSession } from '../../services/admin-session';
export async function logoutFromMenu(_previous: { error: string }) {
  try { await endAdminSession(); }
  catch { return { error: 'No pudimos cerrar la sesión. Intentá nuevamente.' }; }
  redirect('/admin/login');
}
