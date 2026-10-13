'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../services/admin-session';
import type { EventInput } from '@utn/api-client';
export async function saveEvent(id: string | null, previous: { error: string; saved: number }, data: FormData) {
  const api = await requireAdmin();
  const value = (name: string) => { const item = data.get(name); return typeof item === 'string' ? item : ''; };
  const localDate = (name: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value(name)) ? value(name) + ':00-03:00' : '';
  const color = value('color'), status = value('status');
  if (!['BLUE', 'YELLOW', 'LIGHT_BLUE', 'CYAN_GRAY'].includes(color) || !['DRAFT', 'PUBLISHED', 'CANCELLED'].includes(status)) return { ...previous, error: 'Revisá el color y el estado del evento.' };
  const input: EventInput = { title: value('title'), description: value('description'), location: value('location'), startsAt: localDate('startsAt'), endsAt: localDate('endsAt'), color: color as EventInput['color'], status: status as EventInput['status'] };
  try { if (id) await api.updateEvent(id, input); else await api.createEvent(input); }
  catch (error) { return { ...previous, error: error instanceof Error ? error.message : 'No pudimos guardar el evento.' }; }
  revalidatePath('/admin/events');
  return { error: '', saved: previous.saved + 1 };
}
