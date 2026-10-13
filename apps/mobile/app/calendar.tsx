import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { calendarDate, calendarDays, calendarMonthShift, calendarTimeZone, eventOnDay } from '@utn/api-client';
import { calendarColors, calendarLayout, layout, spacing } from '@utn/design-tokens';
import { api } from '../services/api';
import { AppNavigation } from '../components/AppNavigation';
import { EventCard } from '../components/EventCard';
import { Body, Button, Heading, LoadingIndicator, styles } from '../components/ui';
const results: Record<string, string> = {
  saved: 'Google Calendar confirmó el guardado del evento.', exists: 'El evento ya está en tu Google Calendar.',
  cancelled: 'No autorizaste el guardado en Google Calendar.', failed: 'Google Calendar no pudo guardar el evento. Volvé a intentar.',
  invalid: 'La autorización venció o no es válida. Volvé a aceptar el evento.', unavailable: 'El evento o la conexión con Google Calendar no está disponible.',
};
export default function CalendarScreen() {
  const { googleResult, month: requestedMonth } = useLocalSearchParams<{ googleResult?: string; month?: string }>();
  const today = calendarDate(new Date()), [month, setMonth] = useState(requestedMonth && /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today.slice(0, 7)), [selected, setSelected] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const query = useInfiniteQuery({ queryKey: ['events', month], initialPageParam: 1, queryFn: ({ pageParam }) => api.events(month, pageParam), getNextPageParam: page => page.page * page.limit < page.total ? page.page + 1 : undefined });
  const google = useQuery({ queryKey: ['google-calendar-config'], queryFn: () => api.googleCalendarConfig() });
  const events = query.data?.pages.flatMap(page => page.items) ?? [];
  const shown = selected ? events.filter(event => eventOnDay(event, selected)) : events;
  function changeMonth(offset: number) { setMonth(calendarMonthShift(month, offset)); setSelected(null); }
  const gridWidth = Math.max(calendarLayout.minWidth, Math.min(width - spacing.lg * 2, layout.readingMax - spacing.lg * 2));
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <AppNavigation current="calendar" /><Heading>Calendario de eventos</Heading><Body>Horarios de Argentina. Elegí un día para ver sus eventos.</Body>
    {googleResult && results[googleResult] && <Body>{results[googleResult]}</Body>}
    <View style={styles.navigation}><Button title="Mes anterior" variant="secondary" disabled={month === '2000-01'} onPress={() => changeMonth(-1)} /><Button title="Mes siguiente" variant="secondary" disabled={month === '2100-12'} onPress={() => changeMonth(1)} /></View>
    <Heading level={2}>{new Date(`${month}-01T12:00:00-03:00`).toLocaleDateString('es-AR', { timeZone: calendarTimeZone, month: 'long', year: 'numeric' })}</Heading>
    {query.isPending ? <LoadingIndicator title="Cargando eventos…" /> : query.isError ? <><Body>No pudimos cargar los eventos. Revisá tu conexión.</Body><Button title="Reintentar" onPress={() => { void query.refetch(); }} /></> : <>
      {query.fetchStatus === 'paused' && <Body small>Sin conexión. Mostramos los eventos disponibles en este dispositivo.</Body>}
      <ScrollView horizontal contentContainerStyle={{ width: gridWidth }}><View style={[styles.calendarGrid, { width: gridWidth }]}>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <View key={day} style={styles.calendarCell}><Body small>{day}</Body></View>)}
        {calendarDays(month).map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.calendarCell} />;
          const items = events.filter(event => eventOnDay(event, day));
          const colors = [...new Set(items.map(event => event.color))];
          return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${day}, ${items.length} eventos${day === today ? ', hoy' : ''}`} accessibilityState={{ selected: selected === day }} onPress={() => setSelected(day)} style={[styles.calendarCell, selected === day && styles.calendarSelected]}>
            <Body small>{Number(day.slice(-2))}</Body><View style={styles.badges}>{colors.map(color => <View key={color} style={[styles.calendarDot, { backgroundColor: calendarColors[color].background }]} />)}</View>
          </Pressable>;
        })}
      </View></ScrollView>
      <View style={styles.section}><Heading level={2}>{selected ? `Eventos del ${selected.slice(8, 10)}/${selected.slice(5, 7)}` : 'Eventos del mes'}</Heading>
        {selected && <Button title="Ver todo el mes" variant="secondary" onPress={() => setSelected(null)} />}
        {shown.length ? shown.map(event => <EventCard key={event.id} event={event} googleStartUrl={google.data?.enabled ? google.data.startUrl : null} />) : <Body>{selected ? 'No hay eventos publicados para este día.' : 'Todavía no hay eventos publicados para este mes.'}</Body>}
        {query.hasNextPage && <Button title={query.isFetchingNextPage ? 'Cargando…' : 'Cargar más eventos del mes'} disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} />}
        {query.isFetchNextPageError && <Body>No pudimos cargar más eventos. Volvé a intentar.</Body>}
        <Button title="Actualizar eventos" variant="secondary" disabled={query.isRefetching} onPress={() => { void query.refetch(); }} />
      </View>
    </>}
    {!google.data?.enabled && <Body small>El guardado automático requiere que el administrador configure la conexión con Google. Podés guardar los eventos mediante el enlace a Google Calendar.</Body>}
  </ScrollView>;
}
