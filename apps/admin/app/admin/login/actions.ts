'use server';
import { redirect } from 'next/navigation';
import { endAdminSession } from '../../services/admin-session';
export async function logout() {
  await endAdminSession();
  redirect('/admin/login');
}
