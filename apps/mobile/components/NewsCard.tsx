import { Image, View } from 'react-native';
import { router } from 'expo-router';
import type { News } from '@utn/api-client';
import { Badge, Body, Button, Card, Heading, styles } from './ui';

export function NewsCard({ news }: { news: News }) {
  return <Card featured={news.featured}>
    {news.coverImageUrl && <Image source={{ uri: news.coverImageUrl }} accessibilityLabel={`Imagen de ${news.title}`} style={styles.cover} resizeMode="cover" />}
    <View style={styles.badges}><Badge>{news.category.name}</Badge>{news.featured && <Badge featured>Destacada</Badge>}</View>
    <Heading level={2}>{news.title}</Heading>
    {news.publishedAt && <Body small>{new Date(news.publishedAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</Body>}
    <Body>{news.summary}</Body>
    <Button title="Leer noticia" onPress={() => router.push({ pathname: '/news/[slug]', params: { slug: news.slug } })} />
  </Card>;
}
