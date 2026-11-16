import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { News } from '@utn/api-client';
import { mediaSource } from '../services/api';
import { Badge, Card, Text, styles } from './ui';
import { newsStyles } from './news-styles';
import { RichSummary } from './rich-summary';

export function NewsCard({ news, variant = 'compact' }: { news: News; variant?: 'hero' | 'compact' }) {
  const [focused, setFocused] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const image = news.coverImageUrl && news.coverImageUrl !== failedUrl ? news.coverImageUrl : null;
  const date = news.publishedAt ? new Date(news.publishedAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'short' }) : null;
  const open = () => router.push({ pathname: '/news/[slug]', params: { slug: news.slug } });
  const label = `${news.featured ? 'Destacada. ' : ''}${news.category.name}. ${news.title}${date ? '. ' + date : ''}`;
  const imageProps = image ? { source: mediaSource(image), onError: () => setFailedUrl(image), accessible: false as const } : null;
  return <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint="Abrir noticia completa" onPress={open}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [newsStyles.interactive, focused && styles.focused, pressed && styles.pressed]}>
    {variant === 'hero' ? <Card style={newsStyles.hero}>
      {imageProps && <Image {...imageProps} resizeMode="cover" style={newsStyles.heroImage} />}
      <View style={newsStyles.heroBody}>
        {!imageProps && <View pointerEvents="none" accessible={false} importantForAccessibility="no" style={newsStyles.heroArt} />}
        <View style={newsStyles.heroLabels}><Badge featured>{news.featured ? 'Destacada' : 'Última noticia'}</Badge><Text style={newsStyles.heroCategory}>{news.category.name}</Text></View>
        <Text style={newsStyles.heroTitle}>{news.title}</Text>
        <RichSummary value={news.summary} style={newsStyles.heroSummary} onHero />
        <View style={newsStyles.heroFooter}>{date && <Text style={newsStyles.heroDate}>{date}</Text>}<Text style={newsStyles.heroAction}>Leer noticia ↗</Text></View>
      </View>
    </Card> : <View style={newsStyles.row}>
      {imageProps ? <Image {...imageProps} resizeMode="cover" style={newsStyles.thumbnail} /> : <View accessible={false} style={[newsStyles.thumbnail, newsStyles.placeholder]}><Text style={newsStyles.placeholderText}>{news.category.name.trim().slice(0, 2).toLocaleUpperCase('es-AR')}</Text></View>}
      <View style={newsStyles.rowCopy}><Text style={newsStyles.eyebrow}>{news.category.name}{news.featured ? ' · Destacada' : ''}</Text><Text style={newsStyles.rowTitle}>{news.title}</Text>{date && <Text style={newsStyles.rowDate}>{date}</Text>}</View>
    </View>}
  </Pressable>;
}
