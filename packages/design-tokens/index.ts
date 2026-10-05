/** Source of truth: specification §20, official UTN FRBA identity. */
export const brand = {
  colors: {
    blue: '#1F5AAA', lightBlue: '#83A1BB', cyanGray: '#C0D4D3',
    yellow: '#EDAA37', warmGray: '#F3EDDD', beigeGray: '#E0D6CA', black: '#1C1C1C',
  },
  fonts: {
    display: 'Archivo Black', headingAlt: 'Archivo', body: 'Libre Franklin',
    bodySemibold: 'Libre Franklin Semibold', accent: 'Libre Baskerville',
  },
} as const;
const white = '#FFFFFF';
const functional = { success: '#27633D', warning: '#805300', error: '#A51D2D' };
export const colors = {
  light: {
    primary: brand.colors.blue, primaryForeground: white,
    secondary: brand.colors.cyanGray, secondaryForeground: brand.colors.black,
    background: white, foreground: brand.colors.black,
    surface: white, surfaceForeground: brand.colors.black,
    editorial: brand.colors.warmGray, muted: brand.colors.beigeGray,
    mutedForeground: brand.colors.black, border: brand.colors.cyanGray,
    accent: brand.colors.yellow, accentForeground: brand.colors.black,
    header: brand.colors.blue, headerForeground: white,
    focus: brand.colors.blue, info: brand.colors.blue, ...functional,
  },
  dark: {
    primary: brand.colors.blue, primaryForeground: white,
    secondary: brand.colors.lightBlue, secondaryForeground: brand.colors.black,
    background: brand.colors.black, foreground: white,
    surface: brand.colors.black, surfaceForeground: white,
    editorial: brand.colors.black, muted: brand.colors.black,
    mutedForeground: brand.colors.beigeGray, border: brand.colors.lightBlue,
    accent: brand.colors.yellow, accentForeground: brand.colors.black,
    header: brand.colors.black, headerForeground: white,
    focus: brand.colors.yellow, info: brand.colors.lightBlue,
    success: '#8AD6A4', warning: brand.colors.yellow, error: '#FFB4AB',
  },
} as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 };
export const radius = { sm: 4, md: 8, lg: 16, xl: 24, full: 9999 };
export const typography = {
  display: { fontFamily: brand.fonts.display, fontSize: 44, lineHeight: 52, fontWeight: '400' },
  heading1: { fontFamily: brand.fonts.display, fontSize: 36, lineHeight: 44, fontWeight: '400' },
  heading2: { fontFamily: brand.fonts.display, fontSize: 28, lineHeight: 36, fontWeight: '400' },
  heading3: { fontFamily: brand.fonts.display, fontSize: 22, lineHeight: 30, fontWeight: '400' },
  body: { fontFamily: brand.fonts.body, fontSize: 16, lineHeight: 26, fontWeight: '400' },
  bodySmall: { fontFamily: brand.fonts.body, fontSize: 14, lineHeight: 22, fontWeight: '400' },
  label: { fontFamily: brand.fonts.bodySemibold, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  caption: { fontFamily: brand.fonts.body, fontSize: 12, lineHeight: 18, fontWeight: '400' },
  editorialAccent: { fontFamily: brand.fonts.accent, fontSize: 20, lineHeight: 32, fontWeight: '400' },
  alternateHeading: { fontFamily: brand.fonts.headingAlt, fontSize: 24, lineHeight: 32, fontWeight: '600' },
} as const;
// Layout caps preserve reading length on desktop/tablets; touch targets meet 48px.
export const layout = { contentMax: 1152, readingMax: 768, touchTarget: 48, coverAspect: 16 / 9 };
export const interaction = { pressedOpacity: 0.85, disabledOpacity: 0.55 };

/** Display geometry of the original 500px PNGs, without altering their pixels.
 * The logo viewport only removes transparent top/bottom padding (y=206..302).
 */
export const brandMark = {
  name: '19 de Agosto',
  logoWidth: 160, logoHeight: 96 * (160 / 500),
  logoCanvasSize: 160, logoOffsetY: -206 * (160 / 500),
  isotypeSize: 40, isologoSize: 128,
  safeAreaHorizontal: spacing.md, safeAreaVertical: spacing.sm,
} as const;
