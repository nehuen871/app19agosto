import { useState } from 'react';
import { Linking, StyleSheet, Text as NativeText, View, type StyleProp, type TextStyle } from 'react-native';
import { decodeRich, plainDocument, safeRichLink, type RichNode } from '@utn/api-client';
import { brand, colors, spacing, typography } from '@utn/design-tokens';
import { Body, Text } from './ui';

export function RichSummary({ value, style, onHero = false }: { value: string; style?: StyleProp<TextStyle>; onHero?: boolean }) {
  const [error, setError] = useState('');
  function inline(node: RichNode, index: number): React.ReactNode {
    if (node.type === 'hardBreak') return '\n';
    const marks = node.marks ?? [], appearance: TextStyle = {};
    const textStyle = marks.find(mark => mark.type === 'textStyle')?.attrs;
    if (textStyle?.fontFamily) appearance.fontFamily = textStyle.fontFamily;
    if (textStyle?.fontSize) { appearance.fontSize = parseInt(textStyle.fontSize, 10); appearance.lineHeight = appearance.fontSize * typography.body.lineHeight / typography.body.fontSize; }
    if (!onHero && textStyle?.color) appearance.color = textStyle.color;
    if (!onHero && textStyle?.backgroundColor) appearance.backgroundColor = textStyle.backgroundColor;
    if (marks.some(mark => mark.type === 'bold')) { appearance.fontWeight = '600'; if (!appearance.fontFamily) appearance.fontFamily = brand.fonts.bodySemibold; }
    if (marks.some(mark => mark.type === 'italic')) appearance.fontStyle = 'italic';
    const underline = marks.some(mark => ['underline', 'link'].includes(mark.type)), strike = marks.some(mark => mark.type === 'strike');
    if (underline || strike) appearance.textDecorationLine = underline && strike ? 'underline line-through' : underline ? 'underline' : 'line-through';
    const href = marks.find(mark => mark.type === 'link')?.attrs?.href;
    if (href && !onHero) appearance.color = colors.light.primary;
    return <NativeText key={index} style={appearance} accessibilityRole={href && !onHero ? 'link' : undefined} onPress={href && !onHero ? event => { event.stopPropagation(); if (safeRichLink(href)) void Linking.openURL(href).catch(() => setError('No pudimos abrir el vínculo. Volvé a intentar.')); } : undefined}>{node.text}</NativeText>;
  }
  function block(node: RichNode, index: number): React.ReactNode {
    if (['paragraph', 'heading'].includes(node.type)) return <View key={index} style={{ paddingLeft: Number(node.attrs?.indent ?? 0) * spacing.lg }}><Text selectable accessibilityRole={node.type === 'heading' ? 'header' : undefined} style={[style, node.type === 'heading' && typography.heading3, { textAlign: (node.attrs?.textAlign ?? 'left') as TextStyle['textAlign'] }]}>{(node.content ?? []).map(inline)}</Text></View>;
    if (['bulletList', 'orderedList'].includes(node.type)) return <View key={index} style={styles.blocks}>{node.content?.map((item, position) => <View key={position} style={styles.listItem}><Text style={style}>{node.type === 'orderedList' ? `${Number(node.attrs?.start ?? 1) + position}.` : '•'}</Text><View style={styles.listCopy}>{item.content?.map(block)}</View></View>)}</View>;
    if (node.type === 'blockquote') return <View key={index} style={[styles.quote, onHero && styles.heroQuote]}>{node.content?.map(block)}</View>;
    return <View key={index} style={styles.blocks}>{node.content?.map(block)}</View>;
  }
  return <View style={styles.blocks}>{(decodeRich(value) ?? plainDocument(value)).content?.map(block)}{Boolean(error) && <View accessibilityRole="alert"><Body small>{error}</Body></View>}</View>;
}
const styles = StyleSheet.create({ blocks: { gap: spacing.sm }, listItem: { flexDirection: 'row', gap: spacing.sm }, listCopy: { flex: 1, gap: spacing.sm }, quote: { borderLeftWidth: spacing.xs, borderLeftColor: colors.light.border, paddingLeft: spacing.md, gap: spacing.sm }, heroQuote: { borderLeftColor: colors.light.primaryForeground } });
