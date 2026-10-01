import type { CSSProperties, ReactNode } from 'react';
import localFont from 'next/font/local';
import { colors, spacing, radius, typography, layout, brand, interaction } from '@utn/design-tokens';
import './style.css';

const display = localFont({ src: '../../../packages/brand-assets/fonts/ArchivoBlack-Regular.ttf', weight: '400', display: 'swap', variable: '--font-display' });
const body = localFont({ src: [
  { path: '../../../packages/brand-assets/fonts/LibreFranklin-Regular.ttf', weight: '400' },
  { path: '../../../packages/brand-assets/fonts/LibreFranklin-SemiBold.ttf', weight: '600' },
], display: 'swap', variable: '--font-body' });
export const metadata = { title: 'UTN FRBA · Panel', description: 'Espacio de gestión de noticias UTN FRBA' };

export default function Layout({ children }: { children: ReactNode }) {
  const vars = Object.fromEntries([
    ...Object.entries(colors.light).map(([key, value]) => [`--${key}`, value]),
    ...Object.entries(spacing).map(([key, value]) => [`--space-${key}`, `${value}px`]),
    ...Object.entries(radius).map(([key, value]) => [`--radius-${key}`, `${value}px`]),
    ...Object.entries(typography).flatMap(([key, value]) => [
      [`--${key}-size`, `${value.fontSize}px`], [`--${key}-height`, `${value.lineHeight}px`],
      [`--${key}-weight`, value.fontWeight],
      [`--${key}-font`, value.fontFamily === brand.fonts.display ? 'var(--font-display)' : 'var(--font-body)'],
    ]),
    ['--content-max', `${layout.contentMax}px`], ['--reading-max', `${layout.readingMax}px`],
    ['--touch-target', `${layout.touchTarget}px`], ['--cover-aspect', `${layout.coverAspect}`],
    ['--disabled-opacity', `${interaction.disabledOpacity}`], ['--pressed-opacity', `${interaction.pressedOpacity}`],
  ]);
  return <html lang="es" className={`${display.variable} ${body.variable}`}>
    <body style={vars as CSSProperties}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header"><div className="header-inner">
        <span className="brand-mark" data-brand-placeholder="brand-logo">UTN FRBA</span>
        <span className="header-label">Comunicación institucional</span>
      </div></header>
      <main id="contenido">{children}</main>
    </body>
  </html>;
}
