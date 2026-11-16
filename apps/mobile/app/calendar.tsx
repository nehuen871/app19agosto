import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { layout, spacing } from '@utn/design-tokens';
import { calendarDate, calendarMonthShift, calendarTimeZone, eventOnDay } from '@utn/api-client';
import EventCalendarDOM from '../components/event-calendar-dom';
import { api } from '../services/api';
import { agendaWeek, shiftAgendaDay } from '../services/agenda';
import { BottomNavigation } from '../components/bottom-navigation';
import { EventCard } from '../components/EventCard';
import { CalendarArrow } from '../components/calendar-arrow';
import { Body, Button, EmptyState, Heading, LoadingIndicator, QueryNotice, Text, useScreenContentStyle } from '../components/ui';
import { newsStyles } from '../components/news-styles';
import { editorialStyles as es } from '../components/editorial-styles';

const results: Record<string, string> = {
  saved: 'Google Calendar confirmó el guardado del evento.', exists: 'El evento ya está en tu Google Calendar.',
  cancelled: 'No autorizaste el guardado en Google Calendar.', failed: 'Google Calendar no pudo guardar el evento. Volvé a intentar.',
  invalid: 'La autorización venció o no es válida. Volvé a aceptar el evento.', unavailable: 'El evento o la conexión con Google Calendar no está disponible.',
};
export default function CalendarScreen() {
  const contentStyle = useScreenContentStyle();
  const weekStrip = useRef<ScrollView>(null);
  const [weekWidth, setWeekWidth] = useState(0);
  const { googleResult, month: requestedMonth } = useLocalSearchParams<{ googleResult?: string; month?: string }>();
  const today = calendarDate(new Date());
  const initialMonth = requestedMonth && /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : today.slice(0, 7);
  const [month, setMonth] = useState(initialMonth), [anchor, setAnchor] = useState(initialMonth === today.slice(0, 7) ? today : `${initialMonth}-01`);
  const [selected, setSelected] = useState<string | null>(null), [monthView, setMonthView] = useState(false);
  const days = agendaWeek(anchor);
  const visibleDays = Math.min(days.length, Math.max(1, Math.floor((weekWidth + spacing.xs) / (layout.touchTarget + spacing.xs))));
  const dayWidth = weekWidth > 0 ? Math.max(layout.touchTarget, (weekWidth - spacing.xs * (visibleDays - 1)) / visibleDays) : layout.touchTarget;
  const adjacentMonth = days.find(day => day.slice(0, 7) !== month && day >= '2000-01-01' && day <= '2100-12-31')?.slice(0, 7);
  const query = useInfiniteQuery({ queryKey: ['events', month], initialPageParam: 1, queryFn: ({ pageParam, signal }) => api.events(month, pageParam, signal), getNextPageParam: page => page.page * page.limit < page.total ? page.page + 1 : undefined });
  const adjacent = useInfiniteQuery({ queryKey: ['events', adjacentMonth ?? month], initialPageParam: 1, queryFn: ({ pageParam, signal }) => api.events(adjacentMonth ?? month, pageParam, signal), getNextPageParam: page => page.page * page.limit < page.total ? page.page + 1 : undefined, enabled: !monthView && Boolean(adjacentMonth) });
  const google = useQuery({ queryKey: ['google-calendar-config'], queryFn: ({ signal }) => api.googleCalendarConfig(signal) });
  const crossing = !monthView && Boolean(adjacentMonth);
  const events = [...new Map([...(query.data?.pages.flatMap(page => page.items) ?? []), ...(crossing ? adjacent.data?.pages.flatMap(page => page.items) ?? [] : [])].map(event => [event.id, event])).values()].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const shown = events.filter(event => selected ? eventOnDay(event, selected) : monthView || days.some(day => eventOnDay(event, day)));
  const hero = shown.find(event => new Date(event.startsAt).getTime() >= Date.now());
  const rows = shown.filter(event => event.id !== hero?.id);
  function changeMonth(offset: number) { const next = calendarMonthShift(month, offset); setMonth(next); setAnchor(`${next}-01`); setSelected(null); }
  function changeWeek(offset: number) { const next = shiftAgendaDay(anchor, offset * 7); setAnchor(next); setMonth(next.slice(0, 7)); setSelected(null); weekStrip.current?.scrollTo({ x: 0, animated: false }); }
  function selectDay(day: string) { setSelected(day); setAnchor(day); setMonth(day.slice(0, 7)); }
  const googleStartUrl = google.data?.enabled ? google.data.startUrl : null;
  const hasMore = query.hasNextPage || (crossing && adjacent.hasNextPage);
  function refresh() { void query.refetch(); if (crossing) void adjacent.refetch(); }
  return <View style={newsStyles.page}><ScrollView style={newsStyles.page} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={contentStyle}>
    <View style={newsStyles.introduction}>
      <View style={es.calendarNavigation}>
        <Text style={[newsStyles.eyebrow, es.calendarEyebrow]}>Tu semana en la facultad</Text>
        <Button title={monthView ? 'Ver semana' : 'Ver mes'} size="sm" variant="outline" style={es.viewToggle} onPress={() => { setMonthView(!monthView); setSelected(null); }}
          leading={<View accessible={false} importantForAccessibility="no-hide-descendants" style={es.viewIcon}>{monthView ? [0, 1, 2].map(line => <View key={line} style={es.viewIconLine} />) : <View style={es.viewIconCalendar}><View style={es.viewIconCalendarHeader} /></View>}</View>} />
      </View>
      <Heading style={newsStyles.screenTitle}>Hacé lugar a lo que viene.</Heading>
    </View>
    {googleResult && results[googleResult] && <Body>{results[googleResult]}</Body>}
    <View style={es.section}>
      <View style={es.calendarNavigation}>
        {monthView && <CalendarArrow direction="previous" label="Mes anterior" disabled={month === '2000-01'} onPress={() => changeMonth(-1)} />}
        <Heading level={3} style={monthView ? es.monthTitle : undefined}>{new Date(`${month}-01T12:00:00-03:00`).toLocaleDateString('es-AR', { timeZone: calendarTimeZone, month: 'long', year: 'numeric' })}</Heading>
        {monthView && <CalendarArrow direction="next" label="Mes siguiente" disabled={month === '2100-12'} onPress={() => changeMonth(1)} />}
      </View>
    {!monthView && <View style={es.calendarNavigation}>
      <CalendarArrow direction="previous" label="Semana anterior" disabled={shiftAgendaDay(anchor, -7) < '2000-01-01'} onPress={() => changeWeek(-1)} />
      <ScrollView ref={weekStrip} horizontal style={es.weekViewport} onLayout={event => setWeekWidth(event.nativeEvent.layout.width)} contentContainerStyle={es.week} showsHorizontalScrollIndicator={false} accessibilityLabel="Días de la semana">
      {days.map(day => <Button key={day} title={`${new Date(`${day}T12:00:00Z`).toLocaleDateString('es-AR', { timeZone: 'UTC', weekday: 'short' })}\n${Number(day.slice(8))}`} accessibilityLabel={`${new Date(`${day}T12:00:00Z`).toLocaleDateString('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })}${events.some(event => eventOnDay(event, day)) ? ', con eventos cargados' : ''}`} accessibilityState={{ selected: selected === day }} style={[es.day, { width: dayWidth }]} size="sm" variant={selected === day ? 'primary' : 'ghost'} disabled={day < '2000-01-01' || day > '2100-12-31'} onPress={() => selectDay(day)} />)}
      </ScrollView>
      <CalendarArrow direction="next" label="Semana siguiente" disabled={shiftAgendaDay(anchor, 7) > '2100-12-31'} onPress={() => changeWeek(1)} />
    </View>}
    </View>
    {!query.data ? query.fetchStatus === 'paused' ? <QueryNotice paused failed={false} onRetry={() => void query.refetch()} /> : query.isError ? <View style={es.section}><Body>No pudimos cargar los eventos. Revisá tu conexión.</Body><Button title="Reintentar" onPress={() => void query.refetch()} /></View> : <LoadingIndicator title="Cargando eventos…" /> : <>
      <QueryNotice paused={query.fetchStatus === 'paused'} failed={query.isRefetchError} onRetry={() => void query.refetch()} />
      {crossing && !adjacent.data && adjacent.isLoading && <LoadingIndicator title="Completando la semana…" />}
      {crossing && <QueryNotice paused={adjacent.fetchStatus === 'paused'} failed={adjacent.isError} onRetry={() => void adjacent.refetch()} />}
      {monthView && <EventCalendarDOM key={month} month={month} events={events} onSelectDate={async day => selectDay(day)} onSelectEvent={async id => { const event = events.find(item => item.id === id); if (event) selectDay(calendarDate(event.startsAt)); }} dom={{ matchContents: true, scrollEnabled: false }} />}
      {selected && <Button title={monthView ? 'Ver todo el mes' : 'Ver toda la semana'} variant="ghost" size="sm" onPress={() => setSelected(null)} />}
      {hasMore && <Body small>Mostramos los eventos cargados. Cargá más para completar la agenda.</Body>}
      {hero && <EventCard key={`hero-${hero.id}`} event={hero} googleStartUrl={googleStartUrl} variant="hero" />}
      <View style={es.section}><Heading level={3}>{selected ? `Eventos del ${selected.slice(8, 10)}/${selected.slice(5, 7)}` : monthView ? 'En la agenda del mes' : 'Esta semana'}</Heading>
        {rows.map(event => <EventCard key={event.id} event={event} googleStartUrl={googleStartUrl} variant="compact" />)}
        {!shown.length && !(crossing && !adjacent.data) && <EmptyState title={selected ? 'Un día sin eventos cargados' : monthView ? 'No hay eventos cargados este mes' : 'No hay eventos cargados esta semana'} description="Elegí otra fecha, consultá el mes completo o actualizá la agenda." />}
        {shown.length === 1 && hero && <Body small muted>No hay otros eventos cargados para este período.</Body>}
        {hasMore && <Button title={query.isFetchingNextPage || adjacent.isFetchingNextPage ? 'Cargando…' : 'Cargar más eventos'} disabled={query.isFetchingNextPage || adjacent.isFetchingNextPage} onPress={() => { if (query.hasNextPage) void query.fetchNextPage(); if (crossing && adjacent.hasNextPage) void adjacent.fetchNextPage(); }} />}
        {(query.isFetchNextPageError || (crossing && adjacent.isFetchNextPageError)) && <Body>No pudimos cargar más eventos. Volvé a intentar.</Body>}
        <Button title="Actualizar eventos" variant="outline" disabled={query.isRefetching || (crossing && adjacent.isRefetching)} onPress={refresh} />
      </View>
    </>}
    {(google.isError || google.fetchStatus === 'paused') && <Body small>No pudimos consultar la conexión con Google Calendar. Podés abrir el enlace del evento y confirmar el guardado allí.</Body>}
    {google.data && !google.data.enabled && <Body small>Podés abrir los eventos en Google Calendar y confirmar Guardar allí.</Body>}
  </ScrollView><BottomNavigation current="calendar" /></View>;
}
