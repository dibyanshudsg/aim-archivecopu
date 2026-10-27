import { cache } from 'react';
import { verifyAdmin } from '@/lib/admin-auth';

// React cache is scoped to one server render. It avoids repeating the same
// session and role lookup in the dashboard layout and its page.
export const getAdminForPage = cache(() => verifyAdmin());
