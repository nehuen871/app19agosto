import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { Link } from 'expo-router';
import { colors, componentTokens, interaction, layout, radius, spacing, typography } from '@utn/design-tokens';
import { useAuth } from '../services/auth';
import { Text, styles } from './ui';
type Destination = 'news' | 'calendar' | 'account';
const theme = colors.light;

function NavigationIcon({ destination, selected, initials }: { destination: Destination; selected: boolean; initials: string }) {
  const ink = selected ? theme.primary : theme.foreground;
  if (destination === 'account') return <View style={[nav.avatar, { borderColor: ink }, selected && nav.avatarSelected]}><Text style={[nav.initials, { color: ink }]}>{initials}</Text></View>;
  return <View style={nav.icon}>
    {destination === 'news' ? <><View style={[nav.house, { borderColor: ink }, selected && { backgroundColor: ink }]} /><View style={[nav.roof, { borderColor: ink }, selected && { backgroundColor: ink }]} /><View style={nav.door} /></> : <>
      <View style={[nav.calendar, { borderColor: ink }, selected && { backgroundColor: ink }]}><View style={[nav.calendarLine, { backgroundColor: selected ? theme.surface : ink }]} /><View style={nav.calendarGrid}>{[0, 1, 2, 3].map(dot => <View key={dot} style={[nav.calendarDot, { backgroundColor: selected ? theme.surface : ink }]} />)}</View></View>
      <View style={[nav.ring, nav.ringLeft, { backgroundColor: ink }]} /><View style={[nav.ring, nav.ringRight, { backgroundColor: ink }]} />
    </>}
  </View>;
}
const NavigationItem = forwardRef<ComponentRef<typeof Pressable>, PressableProps & { destination: Destination; selected: boolean; initials: string }>(function NavigationItem({ destination, selected, initials, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return <Pressable {...props} ref={ref} accessibilityRole="link" accessibilityState={{ selected }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [nav.item, focused && styles.focused, pressed && { opacity: interaction.pressedOpacity }]}><View accessible={false} importantForAccessibility="no-hide-descendants"><NavigationIcon destination={destination} selected={selected} initials={initials} /></View></Pressable>;
});
export function AppNavigation({ current }: { current: 'news' | 'calendar' | 'account' }) {
  const { user } = useAuth();
  const initials = user?.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase('es-AR') || 'YO';
  const destinations = [{ key: 'news', href: '/', title: 'Noticias' }, { key: 'calendar', href: '/calendar', title: 'Calendario' }, { key: 'account', href: '/account', title: 'Mi cuenta' }] as const;
  return <View style={nav.bar}>{destinations.map(item => <Link key={item.key} href={item.href} replace asChild><NavigationItem destination={item.key} selected={current === item.key} initials={initials} accessibilityLabel={item.title} accessibilityHint={`Ir a ${item.title}`} /></Link>)}</View>;
}
const nav = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: layout.readingMax, alignSelf: 'center' },
  item: { flex: 1, minWidth: layout.touchTarget, minHeight: layout.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  icon: { width: spacing.xl, height: spacing.xl },
  house: { position: 'absolute', left: spacing.xs, top: spacing.md - spacing.xs, width: spacing.lg, height: spacing.md + spacing.xs, borderWidth: componentTokens.focusWidth, borderTopWidth: 0, borderRadius: radius.sm },
  roof: { position: 'absolute', width: spacing.md, height: spacing.md, top: spacing.xs, left: spacing.sm, borderTopWidth: componentTokens.focusWidth, borderLeftWidth: componentTokens.focusWidth, transform: [{ rotate: '45deg' }] },
  door: { position: 'absolute', width: spacing.sm, height: spacing.sm, bottom: 0, left: spacing.md - spacing.xs, backgroundColor: theme.surface, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  calendar: { position: 'absolute', width: spacing.lg, height: spacing.lg, top: spacing.xs, left: spacing.xs, borderWidth: componentTokens.focusWidth, borderRadius: radius.sm, overflow: 'hidden' },
  calendarLine: { height: componentTokens.focusWidth, marginTop: spacing.xs },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.xs, paddingTop: componentTokens.focusWidth },
  calendarDot: { width: spacing.xs, height: spacing.xs, borderRadius: componentTokens.borderWidth },
  ring: { position: 'absolute', width: componentTokens.focusWidth, height: spacing.sm, top: 0, borderRadius: radius.sm },
  ringLeft: { left: spacing.sm + spacing.xs },
  ringRight: { right: spacing.sm + spacing.xs },
  avatar: { width: spacing.xl, height: spacing.xl, borderRadius: radius.full, borderWidth: componentTokens.borderWidth, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.editorial },
  avatarSelected: { borderWidth: componentTokens.focusWidth },
  initials: { ...typography.caption, fontFamily: typography.label.fontFamily },
});
