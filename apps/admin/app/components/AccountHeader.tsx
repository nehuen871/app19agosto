import { cookies } from 'next/headers';
import { AuthRequestError, createAuthApiClient } from '@utn/api-client';
import { apiUrl } from '../services/environment';
import { AccountMenu } from './AccountMenu';
export async function AccountHeader() {
  const token = (await cookies()).get('utn_admin_oauth')?.value;
  if (!token) return null;
  try {
    const { user } = await createAuthApiClient(apiUrl, 'ADMIN').me(token);
    return <AccountMenu name={user.name} email={user.email} />;
  } catch (error) { return error instanceof AuthRequestError && error.status === 401 ? null : <AccountMenu />; }
}
