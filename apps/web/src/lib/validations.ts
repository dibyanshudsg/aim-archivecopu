import { z } from 'zod';

// Admin auth
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Magazine CRUD
export const magazineSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  language: z.enum(['english', 'hindi', 'tamil', 'marathi', 'bengali', 'other']),
  description: z.string().max(2000).default(''),
});

// Issue update
export const issueUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).nullable().optional(),
  topics: z.array(z.string().max(100)).max(20).default([]),
  year: z.number().int().min(1950).max(2100),
  month: z.number().int().min(1).max(12),
  is_published: z.boolean().default(true),
});

// Issue upload (parsed from FormData)
export const issueUploadSchema = z.object({
  magazine_id: z.string().uuid('Invalid magazine ID'),
  title: z.string().min(1, 'Title is required').max(300),
  year: z.coerce.number().int().min(1950).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  description: z.string().max(5000).default(''),
  topics: z.string().default(''),
});

// Public issues query params
export const issuesQuerySchema = z.object({
  magazine_id: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  language: z.enum(['english', 'hindi', 'tamil', 'marathi', 'bengali', 'other']).optional(),
  topic: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

// Search query params
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  magazine_id: z.string().uuid().optional(),
  year_from: z.coerce.number().int().min(1950).max(2100).optional(),
  year_to: z.coerce.number().int().min(1950).max(2100).optional(),
});

/** Parse URL search params into an object for Zod */
export function parseSearchParams(params: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    if (value) obj[key] = value;
  });
  return obj;
}

/** Format Zod errors into a readable message */
export function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}
