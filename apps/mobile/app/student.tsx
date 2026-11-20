import { View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { specialtyLabels } from '@utn/api-client';
import { useAuth } from '../services/auth';
import { api } from '../services/api';
import { BottomNavigation } from '../components/bottom-navigation';
import { UsefulLinksGrid } from '../components/useful-links-grid';
import { Button, Card, Heading, QueryNotice, Text } from '../components/ui';
import { studentHomeStyles as ss } from '../components/student-home-styles';

export default function StudentScreen() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['student', user?.id ?? '', user?.specialty ?? ''], queryFn: ({ signal }) => api.studentPath(signal), enabled: Boolean(user), staleTime: 0 });
  const specialty = query.data?.specialty ?? user?.specialty;
  const plan = query.data?.plan;
  const header = <View style={ss.header}>
    <View style={ss.introduction}><Text style={ss.eyebrow}>Tu espacio en la facultad</Text><Heading style={ss.title}>Estudiar. Conectar. Seguir.</Heading></View>
    <Card style={ss.hero}>
      <Text style={ss.heroEyebrow}>Mi recorrido</Text><Heading level={2} style={ss.heroTitle}>Cada materia{'\n'}abre caminos.</Heading>
      <Text style={ss.heroText}>{!query.data && query.isLoading ? 'Consultando tu recorrido…' : specialty ? `${specialtyLabels[specialty]}${plan ? ` · Plan ${plan.version}` : ''}` : 'Elegí tu especialidad y empezá tu mapa personal.'}</Text>
      <Link href={specialty ? '/student-path' : '/account'} asChild><Button title={specialty ? 'Entrar a mi recorrido ↗' : 'Elegir mi especialidad ↗'} variant="secondary" style={ss.heroAction} /></Link>
    </Card>
    <QueryNotice paused={query.fetchStatus === 'paused'} failed={query.isError} onRetry={() => void query.refetch()} />
  </View>;
  return <View style={ss.page}>{user && <UsefulLinksGrid accountId={user.id} header={header} editorial onRefresh={() => void query.refetch()} refreshing={query.isRefetching} />}<BottomNavigation current="student" /></View>;
}
