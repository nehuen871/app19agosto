import { useState } from 'react';
import { FlatList, View, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../services/api';
import { Body, Button, Card, Heading, styles } from '../components/ui';
export default function NewsScreen() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['news', page], queryFn: () => api.news(page) });
  if (query.isPending) return <View style={styles.content}><ActivityIndicator /><Body>Cargando noticias…</Body></View>;
  if (query.isError) return <View style={styles.content}><Heading>No pudimos cargar las noticias</Heading><Body>Revisá tu conexión a internet y volvé a intentar.</Body><Button title="Reintentar" onPress={() => { void query.refetch(); }} /></View>;
  return <FlatList style={styles.page} contentContainerStyle={styles.content} data={query.data.items} keyExtractor={item => item.id} refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} ListHeaderComponent={<Heading>Noticias de la facultad</Heading>} ListEmptyComponent={<Body>Todavía no hay noticias publicadas.</Body>} renderItem={({ item }) => <Card><Body>{item.category.name}{item.featured ? ' · Destacada' : ''}</Body><Heading>{item.title}</Heading><Body>{item.summary}</Body><Button title="Leer noticia" onPress={() => router.push({ pathname: '/news/[slug]', params: { slug: item.slug } })} /></Card>} ListFooterComponent={<View style={styles.content}><Body>Página {page}</Body><Button title="Anterior" disabled={page === 1} onPress={() => setPage(p => p - 1)} /><Button title="Siguiente" disabled={page * query.data.limit >= query.data.total} onPress={() => setPage(p => p + 1)} /></View>} />;
}
