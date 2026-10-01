export interface Category { id: string; name: string; slug: string }
export interface News { id: string; title: string; slug: string; summary: string; content: string; coverImageUrl: string | null; featured: boolean; publishedAt: string | null; category: Category }
export interface Page<T> { items: T[]; total: number; page: number; limit: number }
