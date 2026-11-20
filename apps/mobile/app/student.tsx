import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '@utn/design-tokens';
import { useAuth } from '../services/auth';
import { api } from '../services/api';
import { BottomNavigation } from '../components/bottom-navigation';
import { StudentMap } from '../components/student-path';
import { UsefulLinksGrid } from '../components/useful-links-grid';
import { Body, Button, Heading, LoadingIndicator, QueryNotice, useScreenContentStyle } from '../components/ui';
import { newsStyles } from '../components/news-styles';

export default function StudentScreen() {
  const { user } = useAuth(), contentStyle = useScreenContentStyle();
  const [tab, setTab] = useState<'path' | 'links'>('path');
  const queryKey = ['student', user?.id ?? '', user?.specialty ?? ''];
  const query = useQuery({ queryKey, queryFn: ({ signal }) => api.studentPath(signal), enabled: Boolean(user) && tab === 'path', staleTime: 0 });
  return <View style={newsStyles.page}><View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}><Heading level={2}>Estudiante</Heading><View style={{ flexDirection: 'row', gap: spacing.sm }}><Button title="Mi recorrido" variant={tab === 'path' ? 'primary' : 'ghost'} accessibilityState={{ selected: tab === 'path' }} onPress={() => setTab('path')} /><Button title="Links útiles" variant={tab === 'links' ? 'primary' : 'ghost'} accessibilityState={{ selected: tab === 'links' }} onPress={() => setTab('links')} /></View></View>
    {tab === 'links' && user ? <UsefulLinksGrid accountId={user.id} /> : <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={() => void query.refetch()} tintColor={colors.light.primary} />}>
    <Body small muted>Tu recorrido en UTN Buenos Aires</Body>
    <QueryNotice paused={query.fetchStatus === 'paused'} failed={query.isError} onRetry={() => void query.refetch()} />
    {query.isLoading && <LoadingIndicator title="Cargando tu camino…" />}
    {query.data && <StudentMap key={query.data.plan?.id ?? user?.specialty ?? 'none'} data={query.data} queryKey={queryKey} />}
  </ScrollView>}<BottomNavigation current="student" /></View>;
}
