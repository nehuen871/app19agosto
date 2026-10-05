import type { CSSProperties, ReactNode } from 'react';
import localFont from 'next/font/local';
import { colors, spacing, radius, typography, layout, brand, interaction, brandMark } from '@utn/design-tokens';
import './style.css';
import { BrandMark } from './components/BrandMark';

const display = localFont({ src: '../../../packages/brand-assets/fonts/ArchivoBlack-Regular.ttf', weight: '400', display: 'swap', variable: '--font-display' });
const accent = localFont({ src: '../../../packages/brand-assets/fonts/LibreBaskerville-Variable.ttf', weight: '400 700', display: 'swap', variable: '--font-accent' });
const alternate = localFont({ src: '../../../packages/brand-assets/fonts/Archivo-Variable.ttf', weight: '100 900', display: 'swap', variable: '--font-alternate' });
const body = localFont({ src: [
  { path: '../../../packages/brand-assets/fonts/LibreFranklin-Regular.ttf', weight: '400' },
  { path: '../../../packages/brand-assets/fonts/LibreFranklin-SemiBold.ttf', weight: '600' },
], display: 'swap', variable: '--font-body' });
export const metadata = { title: '19 de Agosto · UTN FRBA', description: 'Noticias y comunicación de 19 de Agosto · UTN FRBA', icons: { icon: '/brand/brand-isotype.png', apple: '/brand/brand-isotype.png' } };

export default function Layout({ children }: { children: ReactNode }) {
  const vars = Object.fromEntries([
    ...Object.entries(colors.light).map(([key, value]) => [`--${key}`, value]),
    ...Object.entries(spacing).map(([key, value]) => [`--space-${key}`, `${value}px`]),
    ...Object.entries(brandMark).filter(([, value]) => typeof value === 'number').map(([key, value]) => [`--brand-${key}`, `${value}px`]),
    ...Object.entries(radius).map(([key, value]) => [`--radius-${key}`, `${value}px`]),
    ...Object.entries(typography).flatMap(([key, value]) => [
      [`--${key}-size`, `${value.fontSize}px`], [`--${key}-height`, `${value.lineHeight}px`],
      [`--${key}-weight`, value.fontWeight],
      [`--${key}-font`, value.fontFamily === brand.fonts.display ? 'var(--font-display)' : value.fontFamily === brand.fonts.accent ? 'var(--font-accent)' : value.fontFamily === brand.fonts.headingAlt ? 'var(--font-alternate)' : 'var(--font-body)'],
    ]),
    ['--content-max', `${layout.contentMax}px`], ['--reading-max', `${layout.readingMax}px`],
    ['--touch-target', `${layout.touchTarget}px`], ['--cover-aspect', `${layout.coverAspect}`],
    ['--disabled-opacity', `${interaction.disabledOpacity}`], ['--pressed-opacity', `${interaction.pressedOpacity}`],
  ]);
  return <html lang="es" className={`${display.variable} ${body.variable} ${accent.variable} ${alternate.variable}`}>
    <body style={vars as CSSProperties}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header"><div className="header-inner">
        <BrandMark />
        <span className="header-label">Comunicación institucional</span>
      </div></header>
      <nav className="admin-nav" aria-label="Administración"><a href="/admin">Noticias</a><a href="/admin/notifications">Notificaciones</a></nav>
      <main id="contenido">{children}</main>
    </body>
  </html>;
}
