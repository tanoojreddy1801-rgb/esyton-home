export type ArticleStatus = 'draft' | 'pending' | 'published' | 'rejected';

export interface Article {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  authorUid?: string;
  authorName: string;
  authorDesignation?: string;
  status: ArticleStatus;
  readMins: number;
  createdAt?: string;   // ISO strings everywhere in the UI
  updatedAt?: string;
  publishedAt?: string;
  reviewNote?: string;
}

export interface Profile {
  name: string;
  email: string;
  profession: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  reviewNote?: string;
}
