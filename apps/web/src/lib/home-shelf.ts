import type { ApiIssue } from './api';

export type ShelfIssue = Pick<ApiIssue, 'id' | 'title' | 'year' | 'month' | 'pdf_url' | 'cover_image_url' | 'page_count' | 'created_at' | 'is_embargoed' | 'embargo_lift_label'> & {
  magazines: Pick<ApiIssue['magazines'], 'id' | 'name'>;
};

export type ShelfYear = { year: number; count: number };
