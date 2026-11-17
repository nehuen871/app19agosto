'use client';
import { categoryPath, type Category } from '@utn/api-client';
export function CategoryPicker({ categories, value, onChange, disabled }: { categories: Category[]; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const path = categoryPath(categories, value);
  return <>
    <input type="hidden" name="category" value={value} />
    {Array.from({ length: path.length + 1 }, (_, level) => {
      const parent = level ? path[level - 1] : null;
      const options = categories.filter(category => category.parentId === (parent?.id ?? null));
      if (!options.length && level > 0) return null;
      return <div className="category-level" key={parent?.id ?? 'root'}><label htmlFor={`news-category-${level}`}>{level ? `Subcategoría de ${parent!.name}` : 'Categoría'}</label>
        <select id={`news-category-${level}`} value={path[level]?.slug ?? ''} required={level === 0} disabled={disabled || options.length === 0} onChange={event => onChange(event.target.value || parent?.slug || '')}>
          <option value="">{level ? 'Sin más subcategorías' : 'Elegí una categoría'}</option>{options.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select></div>;
    })}
    {path.length > 1 && <span className="field-help">{path.map(category => category.name).join(' → ')}</span>}
  </>;
}
