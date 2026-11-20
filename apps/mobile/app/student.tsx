import { RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@utn/design-tokens';
import { useAuth } from '../services/auth';
import { api } from '../services/api';
import { BottomNavigation } from '../components/bottom-navigation';
import { StudentMap } from '../components/student-path';
import { Body, Heading, LoadingIndicator, QueryNotice, useScreenContentStyle } from '../components/ui';
import { newsStyles } from '../components/news-styles';

export default function StudentScreen() {
  const { user } = useAuth(), contentStyle = useScreenContentStyle();
  const queryKey = ['student', user?.id ?? '', user?.specialty ?? ''];
  const query = useQuery({ queryKey, queryFn: ({ signal }) => api.studentPath(signal), enabled: Boolean(user), staleTime: 0 });
  return <View style={newsStyles.page}><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={() => void query.refetch()} tintColor={colors.light.primary} />}>
    <View><Heading>Estudiante</Heading><Body small muted>Tu recorrido en UTN Buenos Aires</Body></View>
    <QueryNotice paused={query.fetchStatus === 'paused'} failed={query.isError} onRetry={() => void query.refetch()} />
    {query.isLoading && <LoadingIndicator title="Cargando tu camino…" />}
    {query.data && <StudentMap key={query.data.plan?.id ?? user?.specialty ?? 'none'} data={query.data} queryKey={queryKey} />}
  </ScrollView><BottomNavigation current="student" /></View>;
}
