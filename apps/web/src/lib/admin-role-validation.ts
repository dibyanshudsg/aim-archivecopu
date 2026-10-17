import { z } from 'zod';
import { ADMIN_PERMISSIONS } from './admin-permissions';

export const roleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).max(ADMIN_PERMISSIONS.length).refine(values => new Set(values).size === values.length, 'Permissions must be unique'),
}).strict();
