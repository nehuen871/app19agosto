import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors, spacing, radius, typography } from '@utn/design-tokens';
const theme = colors.light;
export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export function Heading({ children }: PropsWithChildren) { return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>; }
export function Body({ children }: PropsWithChildren) { return <Text style={styles.body}>{children}</Text>; }
export function Button({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{title}</Text></Pressable>; }
export const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: theme.background }, content: { padding: spacing.md, gap: spacing.md }, card: { backgroundColor: theme.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: theme.border }, heading: { ...typography.heading, color: theme.foreground }, body: { ...typography.body, color: theme.foreground }, button: { padding: spacing.md, backgroundColor: theme.primary, borderRadius: radius.md }, buttonText: { ...typography.body, color: theme.primaryForeground } });
