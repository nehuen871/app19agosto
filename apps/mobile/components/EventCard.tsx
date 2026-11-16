import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Linking, Platform, View } from 'react-native';
import { calendarTimeZone, googleCalendarUrl, type CalendarEvent } from '@utn/api-client';
import { calendarColors } from '@utn/design-tokens';
import { eventAccepted, rememberEvent } from '../services/event-acceptance';
import { Badge, Body, Button, Card, CardHeader, CardFooter, Heading, Text } from './ui';
import { editorialStyles as es } from './editorial-styles';
export function EventCard({ event, googleStartUrl, variant = 'default' }: { event: CalendarEvent; googleStartUrl: string | null; variant?: 'default' | 'compact' | 'hero' }) {
  const automatic = Boolean(googleStartUrl);
  const [accepted, setAccepted] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setAccepted(eventAccepted(event.id)); }, [event.id]);
  async function accept() {
    setBusy(true); setError('');
    try { const url = googleStartUrl ? (await api.authorizeCalendar(event.id)).startUrl : googleCalendarUrl(event); if (Platform.OS === 'web') window.location.assign(url); else await Linking.openURL(url); rememberEvent(event.id); setAccepted(true); }
    catch { setError('No pudimos abrir Google Calendar. Volvé a intentar.'); }
    finally { setBusy(false); }
  }
  const ended = new Date(event.endsAt) <= new Date();
  const detail = <Card accent={event.color}>
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
  if (variant === 'default') return detail;
  const start = new Date(event.startsAt);
  const date = start.toLocaleDateString('es-AR', { timeZone: calendarTimeZone, weekday: 'long', day: 'numeric', month: 'long' });
  const time = start.toLocaleTimeString('es-AR', { timeZone: calendarTimeZone, hour: '2-digit', minute: '2-digit' });
  return <View style={es.section}>{variant === 'hero' ? <Card style={es.hero}>
    <View style={es.row}><Badge featured>Lo próximo</Badge><Text style={es.heroCaption}>{date}</Text></View>
    <Text accessibilityRole="header" style={es.heroTitle}>{event.title}</Text>
    <Text style={es.heroText}>{time}{event.location ? ` · ${event.location}` : ''}</Text>
    <Button title={expanded ? 'Ocultar evento' : 'Ver evento'} variant="secondary" accessibilityState={{ expanded }} style={es.heroAction} onPress={() => setExpanded(!expanded)} />
  </Card> : <View style={es.eventRow}>
    <View style={es.date}><Text style={es.dateNumber}>{start.toLocaleDateString('es-AR', { timeZone: calendarTimeZone, day: 'numeric' })}</Text><Text style={es.dateMonth}>{start.toLocaleDateString('es-AR', { timeZone: calendarTimeZone, month: 'short' })}</Text></View>
    <View style={es.eventCopy}><Body small>{date} · {time}</Body><Text accessibilityRole="header" style={es.eventTitle}>{event.title}</Text>{event.location && <Body small muted>{event.location}</Body>}<Button title={expanded ? 'Ocultar evento' : 'Ver evento'} size="sm" variant="ghost" accessibilityLabel={`${expanded ? 'Ocultar' : 'Ver'} evento: ${event.title}`} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} /></View>
  </View>}{expanded && detail}</View>;
}
