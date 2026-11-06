import { cookies } from 'next/headers';
import { createAuthApiClient } from '@utn/api-client';
import { requireAdmin } from '../../services/admin-session';
import { apiUrl } from '../../services/environment';
import { ProfileForm } from './form';
export const dynamic = 'force-dynamic';
export default async function AccountPage() {
  await requireAdmin();
  const token = (await cookies()).get('utn_admin_oauth')!.value;
  let user;
  try { user = (await createAuthApiClient(apiUrl, 'ADMIN').me(token)).user; }
  catch { return <section className="state" role="alert"><h1>No pudimos cargar tu cuenta</h1><a href="/admin/account">Reintentar</a></section>; }
  return <section className="record-editor"><div className="page-intro"><p className="eyebrow">Cuenta</p><h1>Administrar mis datos</h1><p>Actualizá el nombre con el que aparecés en la aplicación.</p></div><ProfileForm name={user.name} email={user.email} /></section>;
}
