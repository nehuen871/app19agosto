import { PushOptIn } from '../components/PushOptIn';
import { AppNavigation } from '../components/AppNavigation';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Body, Button, Heading, EmptyState, NewsSkeleton, QueryNotice, useScreenContentStyle, styles } from '../components/ui';
import { NewsCard } from '../components/NewsCard';
export default function NewsScreen() {
  const contentStyle = useScreenContentStyle();
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['news', page], queryFn: ({ signal }) => api.news(page, signal) });
  if (!query.data) return <View style={styles.page}><View style={contentStyle}><AppNavigation current="news" />{query.fetchStatus === 'paused' ? <QueryNotice paused failed={false} onRetry={() => void query.refetch()} /> : query.isError ? <><Heading>No pudimos cargar las noticias</Heading><Body>Revisá tu conexión a internet y volvé a intentar.</Body><Button title="Reintentar" onPress={() => { void query.refetch(); }} /></> : <NewsSkeleton />}</View></View>;
  return <FlatList horizontal={false} numColumns={1} style={styles.page} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={contentStyle} data={query.data.items} keyExtractor={item => item.id} refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} ListHeaderComponent={<View style={styles.section}><AppNavigation current="news" /><Heading>Noticias de la facultad</Heading><PushOptIn /><QueryNotice paused={query.fetchStatus === 'paused'} failed={query.isError} onRetry={() => void query.refetch()} /></View>} ListEmptyComponent={<EmptyState title="Todavía no hay noticias" description="Las próximas publicaciones de la facultad aparecerán acá." />} renderItem={({ item }) => <NewsCard news={item} />} ListFooterComponent={<View style={styles.pagination}><Body small muted>Página {page} de {Math.max(1, Math.ceil(query.data.total / query.data.limit))}</Body><View style={styles.paginationButtons}><Button style={styles.paginationButton} variant="outline" title="Anterior" disabled={page === 1} onPress={() => setPage(p => p - 1)} /><Button style={styles.paginationButton} variant="outline" title="Siguiente" disabled={page * query.data.limit >= query.data.total} onPress={() => setPage(p => p + 1)} /></View></View>} />;
}
