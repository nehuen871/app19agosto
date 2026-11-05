import { View } from 'react-native';
import { Link } from 'expo-router';
import { Button, styles } from './ui';
export function AppNavigation({ current }: { current: 'news' | 'calendar' | 'account' }) {
  const destinations = [{ key: 'news', href: '/', title: 'Noticias' }, { key: 'calendar', href: '/calendar', title: 'Calendario' }, { key: 'account', href: '/account', title: 'Mi cuenta' }] as const;
  return <View style={styles.navigation}>{destinations.map(item => <Link key={item.key} href={item.href} replace asChild><Button title={item.title} accessibilityRole="link" accessibilityState={{ selected: current === item.key }} variant={current === item.key ? 'primary' : 'ghost'} size="sm" style={styles.navigationItem} /></Link>)}</View>;
}
