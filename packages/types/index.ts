export interface Category { id: string; name: string; slug: string }
export interface News { id: string; title: string; slug: string; summary: string; content: string; coverImageUrl: string | null; featured: boolean; publishedAt: string | null; category: Category }
export interface Page<T> { items: T[]; total: number; page: number; limit: number }

export interface NotificationDraft { title: string; body: string; newsId?: string | null }
export interface Notification {
  id: string; title: string; body: string;
  status: 'DRAFT' | 'QUEUED' | 'PROCESSING' | 'SENT' | 'PARTIAL' | 'FAILED';
  newsId: string | null; news: { title: string; slug: string } | null;
  requestedRecipients: number; sentCount: number; failedCount: number;
  createdAt: string; sentAt: string | null;
}

export interface NewsInput {
  title: string; slug: string; summary: string; content: string; category: string;
  coverImageUrl?: string | null; featured?: boolean; status?: 'DRAFT' | 'PUBLISHED';
}
export interface AdminNews extends News { status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }
