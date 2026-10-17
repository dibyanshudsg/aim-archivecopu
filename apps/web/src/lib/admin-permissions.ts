export const ADMIN_PERMISSIONS = [
  'dashboard.view', 'catalogue.view', 'catalogue.edit', 'catalogue.publish',
  'indexing.view', 'indexing.manage', 'navigation.view', 'navigation.manage',
  'storage.view', 'storage.manage', 'settings.view', 'settings.manage',
  'users.manage', 'roles.manage', 'audit.view',
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  'dashboard.view': 'View dashboard',
  'catalogue.view': 'View magazines and issues',
  'catalogue.edit': 'Edit magazines, issues and files',
  'catalogue.publish': 'Publish or delete issues',
  'indexing.view': 'View indexing workspace',
  'indexing.manage': 'Run indexing and edit reviews',
  'navigation.view': 'View navigation',
  'navigation.manage': 'Edit navigation',
  'storage.view': 'View storage',
  'storage.manage': 'Delete storage objects',
  'settings.view': 'View settings',
  'settings.manage': 'Edit settings',
  'users.manage': 'Manage admin users',
  'roles.manage': 'Manage roles and permissions',
  'audit.view': 'View activity log',
};

export function hasPermission(roleId: string, permissions: readonly string[], permission: AdminPermission): boolean {
  return roleId === 'owner' || permissions.includes(permission);
}

export function adminLandingPath(permissions: readonly string[]): string {
  if (permissions.includes('dashboard.view')) return '/admin';
  const choices: Array<[AdminPermission, string]> = [
    ['catalogue.view', '/admin/issues'], ['indexing.view', '/admin/indexing'],
    ['navigation.view', '/admin/navigation'], ['storage.view', '/admin/storage'],
    ['settings.view', '/admin/settings'], ['users.manage', '/admin/users'], ['roles.manage', '/admin/roles'],
    ['audit.view', '/admin/activity'],
  ];
  return choices.find(([permission]) => permissions.includes(permission))?.[1] ?? '/admin/account';
}
