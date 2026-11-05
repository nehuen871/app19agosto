'use dom';
/* eslint-disable @typescript-eslint/no-require-imports -- Metro resolves font assets statically. */
import { useFonts } from 'expo-font';
import { EventCalendar, type CalendarProps } from '@utn/calendar';
import { colors, radius, layout, brand, spacing } from '@utn/design-tokens';
import type { CSSProperties } from 'react';
export default function EventCalendarDOM({ dom: _dom, ...props }: CalendarProps & { dom?: import('expo/dom').DOMProps }) {
  const [loaded, error] = useFonts({
    [brand.fonts.body]: require('../../../packages/brand-assets/fonts/LibreFranklin-Regular.ttf'),
    [brand.fonts.bodySemibold]: require('../../../packages/brand-assets/fonts/LibreFranklin-SemiBold.ttf'),
  });
  if (!loaded && !error) return <p role="status">Preparando calendario…</p>;
  const vars = Object.fromEntries([
    ...Object.entries(colors.light).map(([key, value]) => [`--${key}`, value]),
    ...Object.entries(radius).map(([key, value]) => [`--radius-${key}`, `${value}px`]),
    ['--touch-target', `${layout.touchTarget}px`],
  ]);
  return <div style={{ ...vars, fontFamily: `${brand.fonts.body}, sans-serif`, padding: spacing.xs } as CSSProperties}>
    <EventCalendar {...props} />
  </div>;
}
