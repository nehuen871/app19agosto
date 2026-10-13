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
  coverImageId?: string | null;
}
export interface AdminNews extends News { status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }

export type EventColor = 'BLUE' | 'YELLOW' | 'LIGHT_BLUE' | 'CYAN_GRAY';
export interface EventInput {
  title: string; description: string; location: string; startsAt: string; endsAt: string;
  color: EventColor; status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
}
export interface CalendarEvent extends EventInput { id: string; createdAt: string; updatedAt: string }
export interface MediaImage { id: string; url: string }
export interface AuthUser { id: string; name: string; email: string; role: 'USER' | 'ADMIN' }
export interface AuthSessionInfo { user: AuthUser; expiresAt: string }
export interface GoogleLoginConfig { enabled: boolean; startUrl: string | null }
