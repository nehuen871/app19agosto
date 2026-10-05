---
name: utn-design-system
description: Use whenever creating or modifying UI, components, layouts, typography, colors, images, news cards, navigation or branded assets.
---
# UTN FRBA Design System

Source of truth: `docs/especificacion_app_utnfrba_identidad_visual.md` and the supplied brandbook.

Brand palette:
- #1F5AAA
- #83A1BB
- #C0D4D3
- #EDAA37
- #F3EDDD
- #E0D6CA
- #1C1C1C

Typography:
- Archivo Black: titles/display.
- Libre Baskerville: accents/editorial emphasis.
- Libre Franklin: body text.
- Archivo: alternate/supporting text.

Rules:
1. Never invent brand colors when a semantic token exists.
2. UI must use shared design tokens.
3. Preserve logo/isotype/isologo safe areas and approved placement.
4. Brand mark should generally remain the smallest compositional resource unless the brand is intentionally the focal point.
5. For sequences/carousels, keep brand mark location and size consistent with the cover.
6. Cold photographic treatment and subtle grunge belong to editorial/hero graphics, not routine controls/forms.
7. Buttons, inputs, cards and navigation remain clean, accessible and high-contrast.
8. Every remote-data screen handles loading, success, empty, error and offline.
9. Check accessibility: contrast, touch target, focus, labels and text scaling.
10. Before creating a component, inspect existing UI primitives and add a formal variant rather than duplicating it.

Reject any generated component that hardcodes arbitrary color, spacing, radius or typography.
