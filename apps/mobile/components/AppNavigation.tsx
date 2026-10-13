import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, styles } from './ui';
export function AppNavigation({ current }: { current: 'news' | 'calendar' | 'account' }) {
  return <View style={styles.navigation}><Button title="Noticias" variant={current === 'news' ? 'primary' : 'secondary'} onPress={() => router.push('/')} /><Button title="Calendario" variant={current === 'calendar' ? 'primary' : 'secondary'} onPress={() => router.push('/calendar')} /><Button title="Mi cuenta" variant={current === 'account' ? 'primary' : 'secondary'} onPress={() => router.push('/account')} /></View>;
}
