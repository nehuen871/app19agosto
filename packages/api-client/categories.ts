import type { Category } from '@utn/types';
export function categoryPath(categories: Category[], slug: string): Category[] {
  const byId = new Map(categories.map(category => [category.id, category]));
  const path: Category[] = [], seen = new Set<string>();
  let current = categories.find(category => category.slug === slug);
  while (current && !seen.has(current.id)) {
    path.unshift(current); seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
export function categoryLabel(categories: Category[], category: Category) {
  return categoryPath(categories, category.slug).map(item => item.name).join(' → ');
}
