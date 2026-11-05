/* eslint-disable @typescript-eslint/no-require-imports -- Metro requires static asset paths. */
import { Image, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forwardRef, useState, type ComponentRef, type PropsWithChildren, type ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, radius, typography, layout, interaction, brandMark, calendarColors, calendarLayout, componentTokens } from '@utn/design-tokens';
import type { EventColor } from '@utn/api-client';
const theme = colors.light;

export function useScreenContentStyle() {
  const insets = useSafeAreaInsets();
  return [styles.content, { paddingBottom: spacing.lg + insets.bottom, paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }];
}

export function QueryNotice({ paused, failed, onRetry }: { paused: boolean; failed: boolean; onRetry: () => void }) {
  if (!paused && !failed) return null;
  return <View accessibilityRole="alert" style={styles.notice}><Heading level={3}>{paused ? 'Estás sin conexión' : 'No se pudo actualizar'}</Heading><Body small>{paused ? 'Mostramos el contenido disponible. Se actualizará al reconectar.' : 'Conservamos la información disponible. Podés volver a intentarlo.'}</Body><Button title="Reintentar" variant="outline" size="sm" onPress={onRetry} /></View>;
}

export function BrandMark({ variant = 'logo' }: { variant?: 'logo' | 'isologo' }) {
  return <View style={styles.brandMark} accessible accessibilityRole="image" accessibilityLabel={brandMark.name}>
    <View style={variant === 'isologo' ? styles.isologoViewport : styles.logoViewport}>
      <Image source={variant === 'isologo' ? require('../../../packages/brand-assets/isologo/brand-isologo.png') : require('../../../packages/brand-assets/logo/brand-logo.png')} style={variant === 'isologo' ? styles.isologoImage : styles.logoImage} resizeMode="contain" accessible={false} />
    </View>
  </View>;
}
export function Card({ children, featured = false, accent }: PropsWithChildren<{ featured?: boolean; accent?: EventColor }>) {
  return <View style={[styles.card, featured && styles.featured, accent && { borderLeftWidth: spacing.xs, borderLeftColor: calendarColors[accent].background }]}>{children}</View>;
}
export function CardHeader({ children }: PropsWithChildren) {
  return <View style={styles.cardHeader}>{children}</View>;
}
export function CardFooter({ children }: PropsWithChildren) {
  return <View style={styles.cardFooter}>{children}</View>;
}
export function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase('es-AR');
  return <View style={styles.avatar} accessible accessibilityLabel={`Perfil de ${name}`}><Text style={styles.avatarText}>{initials || '?'}</Text></View>;
}
export function EmptyState({ title, description }: { title: string; description: string }) {
  return <Card><Heading level={3}>{title}</Heading><Body small>{description}</Body></Card>;
}
export function NewsSkeleton() {
  return <View accessibilityRole="progressbar" accessibilityLabel="Cargando noticias…" style={styles.section}><Body small>Cargando noticias…</Body>{[0, 1].map(item => <View key={item} style={styles.card} accessible={false} importantForAccessibility="no-hide-descendants"><View style={styles.skeletonCover} /><View style={styles.skeletonLabel} /><View style={styles.skeletonTitle} /><View style={styles.skeletonLine} /><View style={styles.skeletonLine} /></View>)}</View>;
}
export function Heading({ children, level = 1 }: PropsWithChildren<{ level?: 1 | 2 | 3 }>) {
  return <Text accessibilityRole="header" style={[styles.heading, typography[`heading${level}`]]}>{children}</Text>;
}
export function Body({ children, small = false, muted = false }: PropsWithChildren<{ small?: boolean; muted?: boolean }>) {
  return <Text selectable style={[styles.body, small && typography.bodySmall, muted && styles.mutedText]}>{children}</Text>;
}
export function Badge({ children, featured = false }: PropsWithChildren<{ featured?: boolean }>) {
  return <View style={[styles.badge, featured && styles.badgeFeatured]}><Text style={styles.badgeText}>{children}</Text></View>;
}
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string; variant?: ButtonVariant; size?: keyof typeof componentTokens.sizes;
  loading?: boolean; leading?: ReactNode; style?: StyleProp<ViewStyle>;
};
export const Button = forwardRef<ComponentRef<typeof Pressable>, ButtonProps>(function Button({
  title, disabled = false, variant = 'primary', size = 'md', loading = false, leading, style,
  onFocus, onBlur, onHoverIn, onHoverOut, accessibilityState, ...props
}, ref) {
  const [focused, setFocused] = useState(false), [hovered, setHovered] = useState(false);
  const blocked = disabled || loading;
  const lightText = variant === 'primary' || variant === 'danger';
  return <Pressable {...props} ref={ref} accessibilityRole={props.accessibilityRole ?? 'button'} accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }} disabled={blocked}
    onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }} onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    style={({ pressed }) => [styles.button, componentTokens.sizes[size],
      variant === 'secondary' && styles.buttonSecondary, variant === 'outline' && styles.buttonOutline,
      variant === 'ghost' && styles.buttonGhost, variant === 'danger' && styles.buttonDanger,
      hovered && !blocked && styles.pressed, pressed && styles.pressed, focused && styles.focused, blocked && styles.disabled, style]}>
    {loading ? <ActivityIndicator color={lightText ? theme.primaryForeground : theme.primary} accessibilityElementsHidden /> : leading}
    <Text style={[styles.buttonText, !lightText && styles.buttonSecondaryText]}>{title}</Text>
  </Pressable>;
});
export function LoadingIndicator({ title = 'Cargando noticias…' }: { title?: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={title} style={styles.state}><ActivityIndicator color={theme.primary} /><Body>{title}</Body></View>;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  section: { gap: spacing.lg },
  navigation: { flexDirection: 'row', gap: spacing.xs, backgroundColor: theme.editorial, padding: spacing.xs, borderRadius: radius.lg },
  preferencePanel: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, borderWidth: componentTokens.borderWidth, borderColor: theme.border, padding: spacing.md },
  preferenceText: { flexGrow: 1, flexShrink: 1, gap: spacing.xs },
  pagination: { gap: spacing.md, borderTopWidth: componentTokens.borderWidth, borderColor: theme.border, paddingTop: spacing.lg },
  paginationButtons: { flexDirection: 'row', gap: spacing.sm },
  paginationButton: { flex: 1 },
  navigationItem: { flex: 1, paddingHorizontal: spacing.sm },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', minWidth: calendarLayout.minWidth },
  calendarCell: { width: `${calendarLayout.columnPercent}%`, minHeight: layout.touchTarget, padding: spacing.xs, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, gap: spacing.xs },
  calendarSelected: { borderColor: theme.primary, backgroundColor: theme.secondary },
  calendarDot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.full },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: layout.readingMax, alignSelf: 'center' },
  state: { padding: spacing.lg, gap: spacing.md, backgroundColor: theme.surface, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  brandMark: { paddingHorizontal: brandMark.safeAreaHorizontal, paddingVertical: brandMark.safeAreaVertical },
  launch: { flex: 1, backgroundColor: theme.header, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  isologoViewport: { width: brandMark.isologoSize, height: brandMark.isologoSize },
  isologoImage: { width: '100%', height: '100%' },
  logoViewport: { width: brandMark.logoWidth, height: brandMark.logoHeight, overflow: 'hidden' },
  logoImage: { position: 'absolute', width: brandMark.logoCanvasSize, height: brandMark.logoCanvasSize, top: brandMark.logoOffsetY },
  card: { width: '100%', backgroundColor: theme.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: componentTokens.borderWidth, borderColor: theme.border, borderCurve: 'continuous', boxShadow: componentTokens.cardShadow },
  cardHeader: { gap: spacing.sm },
  cardFooter: { borderTopWidth: componentTokens.borderWidth, borderColor: theme.border, paddingTop: spacing.md, gap: spacing.sm },
  featured: { backgroundColor: theme.editorial, borderTopWidth: spacing.xs, borderTopColor: theme.accent },
  heading: { color: theme.foreground },
  mutedText: { opacity: componentTokens.secondaryTextOpacity },
  avatar: { width: layout.touchTarget + spacing.md, height: layout.touchTarget + spacing.md, borderRadius: radius.full, backgroundColor: theme.secondary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.heading3, color: theme.secondaryForeground },
  notice: { borderWidth: componentTokens.borderWidth, borderLeftWidth: spacing.xs, borderColor: theme.info, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, backgroundColor: theme.surface },
  skeletonCover: { width: '100%', aspectRatio: layout.coverAspect, backgroundColor: theme.secondary, borderRadius: radius.md },
  skeletonLabel: { width: '25%', height: typography.caption.lineHeight, backgroundColor: theme.secondary, borderRadius: radius.full },
  skeletonTitle: { width: '80%', height: typography.heading3.lineHeight, backgroundColor: theme.secondary, borderRadius: radius.sm },
  skeletonLine: { width: '100%', height: typography.bodySmall.lineHeight, backgroundColor: theme.editorial, borderRadius: radius.sm },
  body: { ...typography.body, color: theme.foreground },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: theme.secondary },
  badgeFeatured: { backgroundColor: theme.accent },
  badgeText: { ...typography.label, color: theme.secondaryForeground },
  button: { flexDirection: 'row', gap: spacing.sm, minHeight: layout.touchTarget, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, borderRadius: radius.md, borderWidth: 1, borderColor: theme.primary },
  buttonSecondary: { backgroundColor: theme.secondary, borderColor: theme.secondary },
  buttonOutline: { backgroundColor: theme.surface, borderColor: theme.primary },
  buttonGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  buttonDanger: { backgroundColor: theme.error, borderColor: theme.error },
  focused: { outlineWidth: componentTokens.focusWidth, outlineColor: theme.focus, outlineOffset: componentTokens.focusOffset },
  buttonText: { ...typography.label, flexShrink: 1, textAlign: 'center', color: theme.primaryForeground },
  buttonSecondaryText: { color: theme.foreground },
  pressed: { opacity: interaction.pressedOpacity },
  disabled: { opacity: interaction.disabledOpacity },
  cover: { width: '100%', aspectRatio: layout.coverAspect, borderRadius: radius.md },
  divider: { height: 1, backgroundColor: theme.border },
});
