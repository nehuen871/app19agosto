import { PushOptIn } from '../components/PushOptIn';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Body, Button, Heading, LoadingIndicator, styles } from '../components/ui';
import { NewsCard } from '../components/NewsCard';
export default function NewsScreen() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['news', page], queryFn: () => api.news(page) });
  if (query.isPending) return <LoadingIndicator />;
  if (query.isError) return <View style={styles.content}><Heading>No pudimos cargar las noticias</Heading><Body>Revisá tu conexión a internet y volvé a intentar.</Body><Button title="Reintentar" onPress={() => { void query.refetch(); }} /></View>;
  return <FlatList style={styles.page} contentContainerStyle={styles.content} data={query.data.items} keyExtractor={item => item.id} refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} ListHeaderComponent={<View><Heading>Noticias de la facultad</Heading><PushOptIn /></View>} ListEmptyComponent={<Body>Todavía no hay noticias publicadas.</Body>} renderItem={({ item }) => <NewsCard news={item} />} ListFooterComponent={<View style={styles.content}><Body>Página {page}</Body><Button variant="secondary" title="Anterior" disabled={page === 1} onPress={() => setPage(p => p - 1)} /><Button variant="secondary" title="Siguiente" disabled={page * query.data.limit >= query.data.total} onPress={() => setPage(p => p + 1)} /></View>} />;
}
