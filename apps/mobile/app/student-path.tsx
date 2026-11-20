import { RefreshControl, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@utn/design-tokens';
import { useAuth } from '../services/auth';
import { api } from '../services/api';
import { BottomNavigation } from '../components/bottom-navigation';
import { StudentMap } from '../components/student-path';
import { Body, Button, Heading, LoadingIndicator, QueryNotice, useScreenContentStyle } from '../components/ui';
import { studentHomeStyles as ss } from '../components/student-home-styles';

export default function StudentPathScreen() {
  const { user } = useAuth(), contentStyle = useScreenContentStyle();
  const queryKey = ['student', user?.id ?? '', user?.specialty ?? ''];
  const query = useQuery({ queryKey, queryFn: ({ signal }) => api.studentPath(signal), enabled: Boolean(user), staleTime: 0 });
  return <View style={ss.page}><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.light.primary} />}>
    <Link href="/student" replace asChild><Button title="← Volver a Estudiante" variant="ghost" style={ss.heroAction} /></Link>
    <Heading level={2}>Mi recorrido</Heading><Body small muted>Tu recorrido en UTN Buenos Aires</Body>
    <QueryNotice paused={query.fetchStatus === 'paused'} failed={query.isError} onRetry={() => void query.refetch()} />
    {!query.data && query.isLoading && <LoadingIndicator title="Cargando tu camino…" />}
    {query.data && <StudentMap key={query.data.plan?.id ?? user?.specialty ?? 'none'} data={query.data} queryKey={queryKey} />}
  </ScrollView><BottomNavigation current="student" /></View>;
}
