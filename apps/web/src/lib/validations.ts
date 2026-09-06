import { z } from 'zod';

const optionalFormDataString = (max?: number) =>
  z.preprocess(
    (value) => (value == null ? '' : value),
    max === undefined ? z.string() : z.string().max(max),
  );

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
  magazine_id: z.string().uuid('Invalid magazine ID'),
  title: z.string().min(1, 'Title is required').max(300),
  theme: z.string().max(300).nullable().optional(),
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
  theme: optionalFormDataString(300),
  year: z.coerce.number().int().min(1950).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  description: optionalFormDataString(5000),
  topics: optionalFormDataString(),
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
  q: z.string().trim().min(1).max(500),
  magazine_id: z.string().uuid().optional(),
  year_from: z.coerce.number().int().min(1950).max(2100).optional(),
  year_to: z.coerce.number().int().min(1950).max(2100).optional(),
  availability: z.enum(['read', 'subscriber', 'all']).default('read'),
}).refine((value) => !value.year_from || !value.year_to || value.year_from <= value.year_to, { message: 'Start year must not exceed end year' });

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Must be a valid http(s) URL');

// Site settings
export const siteSettingsSchema = z.object({
  feedback_form_url: optionalUrl,
  feedback_form_edit_url: optionalUrl,
});

const navigationMenuKeySchema = z.enum(['header', 'mobile', 'footer_archive', 'footer_magazines', 'footer_about']);
const navigationLinkTypeSchema = z.enum(['route', 'magazine', 'topic', 'issue', 'external', 'feedback']);

export const navigationItemSchema = z.object({
  menu_key: navigationMenuKeySchema,
  label: z.string().trim().min(1, 'Label is required').max(80),
  link_type: navigationLinkTypeSchema,
  route_key: z.string().trim().max(80).nullable().optional(),
  target_id: z.string().trim().max(300).nullable().optional(),
  href: z.string().trim().max(2000).nullable().optional(),
  params: z.record(z.string().trim().max(120)).default({}),
  sort_order: z.number().int().min(0).max(1000).optional(),
  is_published: z.boolean().default(true),
  opens_new_tab: z.boolean().default(false),
});

export const navigationReorderSchema = z.object({
  menu_key: navigationMenuKeySchema,
  item_ids: z.array(z.string().min(1)).max(100),
});

export const navigationMenuResetSchema = z.object({
  menu_key: navigationMenuKeySchema,
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
