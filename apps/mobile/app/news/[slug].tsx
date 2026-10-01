import { ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Body, Button, Heading, styles } from '../../components/ui';
export default function Detail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useQuery({ queryKey: ['news-detail', slug], queryFn: () => api.detail(slug) });
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>{query.isPending ? <><ActivityIndicator /><Body>Cargando noticia…</Body></> : query.isError ? <><Body>No pudimos cargar la noticia. Revisá tu conexión o intentá más tarde.</Body><Button title="Reintentar" onPress={() => { void query.refetch(); }} /></> : <><Body>{query.data.category.name}</Body><Heading>{query.data.title}</Heading><Body>{query.data.summary}</Body><Body>{query.data.content}</Body></>}</ScrollView>;
}
