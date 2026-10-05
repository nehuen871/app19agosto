import { brandMark } from '@utn/design-tokens';

export function BrandMark({ variant = 'logo' }: { variant?: 'logo' | 'isologo' }) {
  return <span className={`brand-mark brand-mark-${variant}`}>
    <span className={`brand-${variant}-viewport`}>
      <img className={`brand-${variant}-image`} src={`/brand/brand-${variant}.png`} alt={brandMark.name} />
    </span>
  </span>;
}
