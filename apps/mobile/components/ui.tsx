import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors, spacing, radius, typography, layout, interaction } from '@utn/design-tokens';
const theme = colors.light;

export function BrandMark() {
  // Text-only placeholder; replace only when the unmodified official logo is supplied.
  return <View nativeID="brand-logo" style={styles.brandMark}><Text style={styles.brandText}>UTN FRBA</Text></View>;
}
export function Card({ children, featured = false }: PropsWithChildren<{ featured?: boolean }>) {
  return <View style={[styles.card, featured && styles.featured]}>{children}</View>;
}
export function Heading({ children, level = 1 }: PropsWithChildren<{ level?: 1 | 2 | 3 }>) {
  return <Text accessibilityRole="header" style={[styles.heading, typography[`heading${level}`]]}>{children}</Text>;
}
export function Body({ children, small = false }: PropsWithChildren<{ small?: boolean }>) {
  return <Text style={[styles.body, small && typography.bodySmall]}>{children}</Text>;
}
export function Badge({ children, featured = false }: PropsWithChildren<{ featured?: boolean }>) {
  return <View style={[styles.badge, featured && styles.badgeFeatured]}><Text style={styles.badgeText}>{children}</Text></View>;
}
export function Button({ title, onPress, disabled = false, variant = 'primary' }: {
  title: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary';
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, variant === 'secondary' && styles.buttonSecondary,
      pressed && styles.pressed, disabled && styles.disabled]}>
    <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonSecondaryText]}>{title}</Text>
  </Pressable>;
}
export function LoadingIndicator({ title = 'Cargando noticias…' }: { title?: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={title} style={styles.state}><ActivityIndicator color={theme.primary} /><Body>{title}</Body></View>;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: layout.readingMax, alignSelf: 'center' },
  state: { padding: spacing.lg, gap: spacing.md, backgroundColor: theme.background },
  brandMark: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  brandText: { ...typography.label, color: theme.headerForeground },
  card: { backgroundColor: theme.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: theme.border },
  featured: { backgroundColor: theme.editorial },
  heading: { color: theme.foreground },
  body: { ...typography.body, color: theme.foreground },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: theme.secondary },
  badgeFeatured: { backgroundColor: theme.accent },
  badgeText: { ...typography.label, color: theme.secondaryForeground },
  button: { minHeight: layout.touchTarget, alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: theme.primary, borderRadius: radius.md, borderWidth: 1, borderColor: theme.primary },
  buttonSecondary: { backgroundColor: theme.surface },
  buttonText: { ...typography.label, color: theme.primaryForeground },
  buttonSecondaryText: { color: theme.primary },
  pressed: { opacity: interaction.pressedOpacity },
  disabled: { opacity: interaction.disabledOpacity },
  cover: { width: '100%', aspectRatio: layout.coverAspect, borderRadius: radius.md },
  divider: { height: 1, backgroundColor: theme.border },
});
