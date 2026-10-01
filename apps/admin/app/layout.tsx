import type { CSSProperties, ReactNode } from 'react';
import { colors, spacing, radius, typography } from '@utn/design-tokens';
import './style.css';
export const metadata = { title: 'UTN FRBA · Panel', description: 'Espacio de gestión de noticias UTN FRBA' };
export default function Layout({ children }: { children: ReactNode }) {
  const vars = Object.fromEntries([...Object.entries(colors.light).map(([key, value]) => [`--${key}`, value]), ...Object.entries(spacing).map(([key, value]) => [`--space-${key}`, `${value}px`]), ['--radius', `${radius.lg}px`], ['--body-size', `${typography.body.fontSize}px`], ['--body-height', `${typography.body.lineHeight}px`], ['--heading-size', `${typography.heading.fontSize}px`], ['--heading-height', `${typography.heading.lineHeight}px`]]);
  return <html lang="es"><body style={vars as CSSProperties}><header><strong>UTN FRBA</strong><span>Comunicación institucional</span></header><main>{children}</main></body></html>;
}
