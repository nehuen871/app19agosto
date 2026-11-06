import { mediaSource } from '../services/api';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import type { News } from '@utn/api-client';
import { Badge, Body, Button, Card, CardFooter, CardHeader, Heading, styles } from './ui';

export function NewsCard({ news }: { news: News }) {
  return <Card featured={news.featured}>
    {news.coverImageUrl && <Image source={mediaSource(news.coverImageUrl)} accessibilityLabel={`Imagen de ${news.title}`} style={styles.cover} resizeMode="cover" />}
    <CardHeader><View style={styles.badges}><Badge>{news.category.name}</Badge>{news.featured && <Badge featured>Destacada</Badge>}</View>
    <Heading level={2}>{news.title}</Heading></CardHeader>
    {news.publishedAt && <Body small muted>{new Date(news.publishedAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</Body>}
    <Body>{news.summary}</Body>
    <CardFooter><Button variant="outline" title="Leer noticia" onPress={() => router.push({ pathname: '/news/[slug]', params: { slug: news.slug } })} /></CardFooter>
  </Card>;
}
