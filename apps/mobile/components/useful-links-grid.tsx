import { useState, type ReactElement } from 'react';
import { FlatList, Image, Linking, Platform, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { colors, spacing, radius, typography, layout, usefulLinksLayout } from '@utn/design-tokens';
import type { UsefulLink } from '@utn/api-client';
import { api, mediaSource } from '../services/api';
import { Badge, Body, Button, Card, EmptyState, Heading, LoadingIndicator, QueryNotice, Text, styles, useScreenContentStyle } from './ui';
const theme = colors.light;
function LinkTile({ item, onError, wide = item.featured, editorial = false }: { item: UsefulLink; onError: (message: string) => void; wide?: boolean; editorial?: boolean }) {
  const [focused, setFocused] = useState(false), [failed, setFailed] = useState(false), [opening, setOpening] = useState(false);
  async function open() {
    if (opening) return;
    setOpening(true); onError('');
    try { if (!/^https?:\/\//i.test(item.url)) throw new Error('Invalid link'); if (Platform.OS === 'web') window.location.assign(item.url); else await Linking.openURL(item.url); }
    catch { onError(`No se pudo abrir “${item.title}”. Revisá tu conexión e intentá nuevamente.`); }
    finally { setOpening(false); }
  }
  const image = failed ? <View style={[ls.image, wide && ls.featureImage, wide && editorial && ls.compactFeatureImage, ls.fallback]}><Text style={ls.placeholder}>↗</Text></View> : <Image source={mediaSource(item.imageUrl)} style={[ls.image, wide && ls.featureImage, wide && editorial && ls.compactFeatureImage]} resizeMode="cover" accessible={false} onError={() => setFailed(true)} />;
  return <Pressable accessibilityRole="link" accessibilityLabel={`${item.featured ? 'Destacado. ' : ''}${item.title}. ${item.description}`} accessibilityHint={`Abrir sitio externo: ${new URL(item.url).hostname}`} accessibilityState={{ busy: opening, disabled: opening }} disabled={opening} onPress={() => void open()} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [ls.tile, focused && styles.focused, pressed && styles.pressed]}>
    <Card style={[ls.card, editorial && ls.editorialCard, wide && ls.featured, wide && editorial && ls.editorialFeatured]}>
      {(!wide || editorial) && image}
      <View style={[ls.copy, wide && ls.featureCopy]}>{item.featured && <Badge featured>Destacado</Badge>}<Text style={[ls.title, wide && ls.featureText]}>{item.title}</Text><Text style={[ls.description, wide && ls.featureText]}>{item.description}</Text><Text style={[ls.open, wide && ls.featureText]}>{opening ? 'Abriendo…' : 'Abrir sitio ↗'}</Text></View>
      {wide && !editorial && image}
    </Card>
  </Pressable>;
}
export function UsefulLinksGrid({ accountId, header, editorial = false, onRefresh, refreshing = false }: { accountId: string; header?: ReactElement; editorial?: boolean; onRefresh?: () => void; refreshing?: boolean }) {
  const contentStyle = useScreenContentStyle(), { fontScale } = useWindowDimensions();
  const [showAll, setShowAll] = useState(false);
  const [width, setWidth] = useState(0), [error, setError] = useState('');
  const query = useInfiniteQuery({ queryKey: ['useful-links', accountId], initialPageParam: 1, queryFn: ({ pageParam, signal }) => api.usefulLinks(pageParam, signal), getNextPageParam: page => page.page * page.limit < page.total ? page.page + 1 : undefined, staleTime: 0 });
  const items = [...new Map((query.data?.pages.flatMap(page => page.items) ?? []).map(item => [item.id, item])).values()];
  const preview = editorial && !showAll;
  const displayed = preview ? items.slice(0, 3) : items;
  const isWide = (item: UsefulLink) => item.featured;
  const twoColumns = width >= usefulLinksLayout.cardMinWidth * usefulLinksLayout.columns + spacing.md && fontScale <= 1.3;
  const rows: UsefulLink[][] = [];
  for (const item of displayed) {
    const previous = rows.at(-1);
    if (twoColumns && !isWide(item) && previous?.length === 1 && !isWide(previous[0])) previous.push(item);
    else rows.push([item]);
  }
  return <FlatList style={ls.list} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={contentStyle} data={rows} keyExtractor={row => row.map(item => item.id).join(':')} onLayout={event => setWidth(Math.min(layout.readingMax, event.nativeEvent.layout.width) - spacing.lg * 2)}
    refreshControl={<RefreshControl refreshing={query.isRefetching || refreshing} onRefresh={() => { void query.refetch(); onRefresh?.(); }} tintColor={theme.primary} />}
    ListHeaderComponent={<View style={ls.pageHeader}>{header}<View style={ls.header}><Heading level={2}>{editorial ? 'Te sirve hoy' : 'Todo lo que usás.\nSiempre cerca.'}</Heading><Body small>Links útiles para tu vida universitaria.</Body><QueryNotice paused={query.fetchStatus === 'paused'} failed={query.isError} onRetry={() => void query.refetch()} />{query.isLoading && <LoadingIndicator title="Cargando links útiles…" />}{Boolean(error) && <View accessibilityRole="alert"><Body>{error}</Body></View>}</View></View>}
    ListEmptyComponent={query.data && !query.isError ? <EmptyState title="Próximamente, tus accesos acá" description="Los enlaces publicados por el equipo aparecerán en este espacio." /> : null}
    renderItem={({ item: row }) => <View style={ls.row}>{row.map(item => <View key={item.id} style={[ls.cell, twoColumns && row.length === 1 && !isWide(item) && { flexGrow: 0, flexShrink: 0, flexBasis: (width - spacing.md) / 2 }]}><LinkTile key={item.id + item.imageId} item={item} onError={setError} wide={isWide(item)} editorial={editorial} /></View>)}</View>}
    ListFooterComponent={preview && (query.data?.pages[0]?.total ?? 0) > 3 ? <Button title="Explorar todos los links ↗" variant="outline" onPress={() => setShowAll(true)} /> : query.hasNextPage ? <Button title={query.isFetchingNextPage ? 'Cargando…' : 'Ver más enlaces'} loading={query.isFetchingNextPage} variant="outline" onPress={() => { if (!query.isFetching) void query.fetchNextPage(); }} /> : null} />;
}
const ls = StyleSheet.create({
  pageHeader: { gap: spacing.xl },
  editorialCard: { backgroundColor: theme.surface, borderRadius: radius.xl },
  editorialFeatured: { backgroundColor: theme.primary, borderColor: theme.primary, flexDirection: 'row', borderRadius: radius.md },
  compactFeatureImage: { height: undefined, alignSelf: 'stretch' },
  list: { flex: 1 }, header: { gap: spacing.sm }, row: { flexDirection: 'row', gap: spacing.md }, cell: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  tile: { flex: 1, borderRadius: radius.lg, minHeight: spacing['2xl'] }, card: { flex: 1, padding: 0, gap: 0, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: theme.editorial },
  featured: { flexDirection: 'row', backgroundColor: theme.primary, borderColor: theme.primary }, copy: { padding: spacing.md, gap: spacing.sm, flex: 1 }, featureCopy: { minWidth: 0 },
  image: { width: '100%', flexShrink: 0, aspectRatio: usefulLinksLayout.imageAspect, backgroundColor: theme.secondary }, featureImage: { width: usefulLinksLayout.featuredImageWidth, height: '100%', aspectRatio: undefined, minHeight: spacing['2xl'] * 4 },
  title: { ...typography.label, fontSize: typography.body.fontSize }, description: { ...typography.bodySmall }, featureText: { color: theme.primaryForeground },
  open: { ...typography.label, paddingTop: spacing.sm, marginTop: 'auto' }, fallback: { alignItems: 'center', justifyContent: 'center' }, placeholder: { ...typography.heading2, color: theme.primary },
});
