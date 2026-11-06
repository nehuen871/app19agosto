'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAuthApiClient } from '@utn/api-client';
import { requireAdmin } from '../../services/admin-session';
import { apiUrl } from '../../services/environment';
export async function saveProfile(previous: { error: string; saved: boolean }, data: FormData) {
  const name = data.get('name');
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 200) return { ...previous, error: 'Ingresá un nombre de hasta 200 caracteres.', saved: false };
  try {
    await requireAdmin('action');
    const token = (await cookies()).get('utn_admin_oauth')!.value;
    await createAuthApiClient(apiUrl, 'ADMIN').updateProfile(name.trim(), token);
  } catch (error) { return { error: error instanceof Error ? error.message : 'No pudimos guardar el perfil.', saved: false }; }
  revalidatePath('/admin', 'layout');
  return { error: '', saved: true };
}
