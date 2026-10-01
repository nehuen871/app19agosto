import { ScrollView, View, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Badge, Body, Button, Heading, LoadingIndicator, styles } from '../../components/ui';
export default function Detail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useQuery({ queryKey: ['news-detail', slug], queryFn: () => api.detail(slug) });
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>{query.isPending ? <LoadingIndicator title="Cargando noticia…" /> : query.isError ? <><Body>No pudimos cargar la noticia. Revisá tu conexión o intentá más tarde.</Body><Button title="Reintentar" onPress={() => { void query.refetch(); }} /></> : <><View style={styles.badges}><Badge>{query.data.category.name}</Badge>{query.data.featured && <Badge featured>Destacada</Badge>}</View><Heading>{query.data.title}</Heading><Body>{query.data.summary}</Body>{query.data.coverImageUrl && <Image source={{ uri: query.data.coverImageUrl }} accessibilityLabel={`Imagen de ${query.data.title}`} style={styles.cover} resizeMode="cover" />}<View style={styles.divider} /><Body>{query.data.content}</Body></>}</ScrollView>;
}
