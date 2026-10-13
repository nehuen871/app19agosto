import { googleOAuth } from '../../../services/google-oauth';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return googleOAuth(request, 'callback'); }
