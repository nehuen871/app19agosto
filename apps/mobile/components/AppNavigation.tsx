import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { styles } from './ui';
export function AppNavigation({ current }: { current: 'news' | 'calendar' | 'account' }) {
  const destinations = [{ key: 'news', href: '/', title: 'Noticias' }, { key: 'calendar', href: '/calendar', title: 'Calendario' }, { key: 'account', href: '/account', title: 'Mi cuenta' }] as const;
  return <View style={styles.navigation}>{destinations.map(item => <Link key={item.key} href={item.href} replace asChild><Pressable accessibilityRole="link" accessibilityState={{ selected: current === item.key }} disabled={current === item.key} style={({ pressed }) => [styles.button, current !== item.key && styles.buttonSecondary, pressed && styles.pressed]}><Text style={[styles.buttonText, current !== item.key && styles.buttonSecondaryText]}>{item.title}</Text></Pressable></Link>)}</View>;
}
