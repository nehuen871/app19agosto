import { StyleSheet, View } from 'react-native';
import { colors, componentTokens, layout, radius, spacing } from '@utn/design-tokens';
import { Button } from './ui';

export function CalendarArrow({ direction, label, disabled, onPress }: { direction: 'previous' | 'next'; label: string; disabled: boolean; onPress: () => void }) {
  return <Button title={label} accessibilityLabel={label} iconOnly size="sm" variant="secondary" disabled={disabled} onPress={onPress} style={styles.button}
    leading={<View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.glyph}><View style={[styles.chevron, direction === 'previous' ? styles.previous : styles.next]} /></View>} />;
}
const styles = StyleSheet.create({
  button: { width: layout.touchTarget, height: layout.touchTarget, flexShrink: 0, paddingHorizontal: spacing.sm, borderRadius: radius.full },
  glyph: { width: spacing.lg, height: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: spacing.sm + spacing.xs, height: spacing.sm + spacing.xs, borderTopWidth: componentTokens.focusWidth, borderRightWidth: componentTokens.focusWidth, borderColor: colors.light.primary },
  previous: { transform: [{ rotate: '225deg' }] },
  next: { transform: [{ rotate: '45deg' }] },
});
