import { useId } from 'react';
import { colors, componentTokens, layout, radius, spacing, typography } from '@utn/design-tokens';
import { specialties, specialtyLabels } from '@utn/api-client';
import type { SpecialtySelectProps } from './specialty-select';
export function SpecialtySelect({ value, onChange, disabled }: SpecialtySelectProps) {
  const id = useId();
  return <select id={id} aria-label="Especialidad" value={value ?? ''} disabled={disabled} onChange={event => onChange(specialties.find(specialty => specialty === event.target.value) ?? null)}
    style={{ width: '100%', minHeight: layout.touchTarget, padding: spacing.md, fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.light.foreground, backgroundColor: colors.light.surface, border: `${componentTokens.borderWidth}px solid ${colors.light.border}`, borderRadius: radius.md }}>
    <option value="">Sin especificar</option>{specialties.map(specialty => <option key={specialty} value={specialty}>{specialtyLabels[specialty]}</option>)}
  </select>;
}
