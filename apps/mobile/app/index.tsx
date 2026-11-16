import { useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { News } from '@utn/api-client';
import { api } from '../services/api';
import { BottomNavigation } from '../components/bottom-navigation';
import { Body, Button, Heading, EmptyState, NewsSkeleton, QueryNotice, Text, useScreenContentStyle, styles } from '../components/ui';
import { NewsCard } from '../components/NewsCard';
import { newsStyles } from '../components/news-styles';

export default function NewsScreen() {
  const contentStyle = useScreenContentStyle();
  const list = useRef<FlatList<News>>(null);
  const [{ page, category }, setSelection] = useState({ page: 1, category: '' });
  const query = useQuery({ queryKey: ['news', category, page], queryFn: ({ signal }) => api.news(page, signal, { category }) });
  const featured = useQuery({ queryKey: ['news-featured', category], queryFn: ({ signal }) => api.news(1, signal, { category, featured: true, limit: 1 }), enabled: page === 1 });
  const categories = useQuery({ queryKey: ['news-categories'], queryFn: ({ signal }) => api.categories(signal) });
  const hero = page === 1 && query.data ? featured.data?.items[0] ?? query.data.items[0] : undefined;
  const rows = (query.data?.items ?? []).filter(item => item.id !== hero?.id);
  const pages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.limit)) : 1;
  function select(nextCategory: string, nextPage = 1) {
    setSelection({ category: nextCategory, page: nextPage });
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }
  function refresh() { void query.refetch(); void categories.refetch(); if (page === 1) void featured.refetch(); }
  const failed = query.isError || (page === 1 && featured.isError);
  const paused = query.fetchStatus === 'paused' || (page === 1 && featured.fetchStatus === 'paused');

  return <View style={newsStyles.page}>
    <FlatList ref={list} horizontal={false} numColumns={1} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      contentContainerStyle={[contentStyle, newsStyles.content]} data={rows} keyExtractor={item => item.id}
      refreshing={query.isRefetching || (page === 1 && featured.isRefetching)} onRefresh={refresh}
      ListHeaderComponent={<View style={newsStyles.header}>
        <View style={newsStyles.introduction}><Text style={newsStyles.eyebrow}>Tu comunidad, al día</Text><Heading style={newsStyles.screenTitle}>Lo que importa.</Heading></View>
        <View style={newsStyles.filters} accessibilityLabel="Filtrar noticias por categoría">
          <Button title="Todas" size="sm" variant={!category ? 'primary' : 'outline'} accessibilityState={{ selected: !category }} style={newsStyles.filter} onPress={() => select('')} />
          {categories.data?.map(item => <Button key={item.id} title={item.name} size="sm" variant={category === item.slug ? 'primary' : 'outline'} accessibilityLabel={`Filtrar por ${item.name}`} accessibilityState={{ selected: category === item.slug }} style={newsStyles.filter} onPress={() => select(item.slug)} />)}
        </View>
        {!categories.data && categories.isLoading && <Body small muted>Cargando categorías…</Body>}
        {(categories.isError || categories.fetchStatus === 'paused') && <View style={newsStyles.notice}><Body small>{categories.fetchStatus === 'paused' ? 'Los filtros se actualizarán al recuperar la conexión.' : 'No pudimos actualizar los filtros. Podés seguir leyendo las noticias.'}</Body><Button title="Reintentar filtros" variant="ghost" size="sm" onPress={() => void categories.refetch()} /></View>}
        {query.data && <QueryNotice paused={paused} failed={failed} onRetry={refresh} />}
        {hero && <NewsCard key={hero.id} news={hero} variant="hero" />}
        {rows.length > 0 && <View style={newsStyles.sectionHeading}><Text accessibilityRole="header" style={newsStyles.sectionTitle}>{hero ? 'También pasa' : 'Últimas noticias'}</Text><Body small muted>{query.data?.total} {query.data?.total === 1 ? 'publicación' : 'publicaciones'}{category ? ' en esta categoría' : ' en tu comunidad'}</Body></View>}
      </View>}
      ListEmptyComponent={!query.data
        ? query.fetchStatus === 'paused' ? <QueryNotice paused failed={false} onRetry={refresh} />
          : query.isError ? <View style={styles.section}><Heading level={3}>No pudimos cargar las noticias</Heading><Body>Revisá tu conexión a internet y volvé a intentar.</Body><Button title="Reintentar" onPress={refresh} /></View>
          : <NewsSkeleton />
        : hero ? null : <EmptyState title={category ? 'Todavía no hay noticias en esta categoría' : 'Todavía no hay noticias'} description={category ? 'Probá con otra categoría o volvé a Todas.' : 'Las próximas publicaciones de la facultad aparecerán acá.'} />}
      renderItem={({ item }) => <NewsCard news={item} />}
      ListFooterComponent={query.data && pages > 1 ? <View style={newsStyles.footer}><Body small muted>Página {page} de {pages}</Body><View style={styles.paginationButtons}><Button style={styles.paginationButton} variant="outline" title="Anterior" disabled={page === 1} onPress={() => select(category, page - 1)} /><Button style={styles.paginationButton} variant="outline" title="Siguiente" disabled={page >= pages} onPress={() => select(category, page + 1)} /></View></View> : null}
    />
    <BottomNavigation current="news" />
  </View>;
}
