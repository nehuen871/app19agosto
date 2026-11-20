import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@utn/design-tokens';
const theme = colors.light;
export const studentHomeStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background },
  header: { gap: spacing.lg },
  introduction: { gap: spacing.sm },
  eyebrow: { ...typography.caption, fontFamily: typography.label.fontFamily, textTransform: 'uppercase', color: theme.primary },
  title: { ...typography.heading2, color: theme.foreground },
  hero: { backgroundColor: theme.primary, borderColor: theme.primary, borderRadius: radius.xl },
  heroEyebrow: { ...typography.label, color: theme.primaryForeground },
  heroTitle: { ...typography.heading2, color: theme.primaryForeground },
  heroText: { ...typography.bodySmall, color: theme.primaryForeground },
  heroAction: { alignSelf: 'flex-start', maxWidth: '100%' },
});
