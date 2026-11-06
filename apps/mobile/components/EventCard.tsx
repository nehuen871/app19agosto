import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Linking, Platform } from 'react-native';
import { calendarTimeZone, googleCalendarUrl, type CalendarEvent } from '@utn/api-client';
import { calendarColors } from '@utn/design-tokens';
import { eventAccepted, rememberEvent } from '../services/event-acceptance';
import { Badge, Body, Button, Card, CardHeader, CardFooter, Heading } from './ui';
export function EventCard({ event, googleStartUrl }: { event: CalendarEvent; googleStartUrl: string | null }) {
  const automatic = Boolean(googleStartUrl);
  const [accepted, setAccepted] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { setAccepted(eventAccepted(event.id)); }, [event.id]);
  async function accept() {
    setBusy(true); setError('');
    try { const url = googleStartUrl ? (await api.authorizeCalendar(event.id)).startUrl : googleCalendarUrl(event); if (Platform.OS === 'web') window.location.assign(url); else await Linking.openURL(url); rememberEvent(event.id); setAccepted(true); }
    catch { setError('No pudimos abrir Google Calendar. Volvé a intentar.'); }
    finally { setBusy(false); }
  }
  const ended = new Date(event.endsAt) <= new Date();
  return <Card accent={event.color}>
    <CardHeader><Badge>{calendarColors[event.color].label}</Badge><Heading level={3}>{event.title}</Heading></CardHeader>
    <Body small muted>{new Date(event.startsAt).toLocaleString('es-AR', { timeZone: calendarTimeZone })} – {new Date(event.endsAt).toLocaleString('es-AR', { timeZone: calendarTimeZone })}</Body>
    {event.location && <Body small>Lugar: {event.location}</Body>}{event.description && <Body>{event.description}</Body>}
    {ended ? <Body small>Este evento ya finalizó.</Body> : <>
      {accepted && <Body small>Aceptado en este dispositivo.</Body>}
      <CardFooter><Button loading={busy} title={busy ? 'Abriendo…' : automatic ? 'Aceptar y guardar en Google Calendar' : 'Aceptar y abrir Google Calendar'} disabled={busy} onPress={() => { void accept(); }} /></CardFooter>
      <Body small>{automatic ? 'Google te pedirá autorización para guardar el evento en tu calendario.' : 'Se abre Google Calendar con los datos del evento. Confirmá Guardar allí para agregarlo a tu calendario.'}</Body>
    </>}
    {error && <Body small>{error}</Body>}
  </Card>;
}
