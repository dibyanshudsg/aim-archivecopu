import { getDb, createId, nowIso } from './client';
import { ADMIN_PERMISSIONS, type AdminPermission } from '../admin-permissions';

export interface AdminAccount {
  id: string; email: string; name: string; roleId: string; roleName: string;
  isActive: boolean; sessionVersion: number; mustChangePassword: boolean; temporaryPasswordExpiresAt: string | null;
  permissions: AdminPermission[]; passwordHash: string | null;
}

export function publicAdmin(account: AdminAccount): Omit<AdminAccount, 'passwordHash' | 'sessionVersion'> {
  return {
    id: account.id, email: account.email, name: account.name, roleId: account.roleId,
    roleName: account.roleName, isActive: account.isActive, mustChangePassword: account.mustChangePassword,
    temporaryPasswordExpiresAt: account.temporaryPasswordExpiresAt,
    permissions: account.permissions,
  };
}

const select = `SELECT a.id, a.email, a.name, a.role_id, a.is_active, a.session_version,
 a.password_hash, a.must_change_password, a.temporary_password_expires_at, COALESCE(r.name, 'Unknown') AS role_name
 FROM admins a LEFT JOIN admin_roles r ON r.id=a.role_id`;

async function mapAccount(row: Record<string, unknown>): Promise<AdminAccount> {
  const roleId = String(row.role_id);
  const result = await getDb().execute({ sql: 'SELECT permission FROM admin_role_permissions WHERE role_id=?', args: [roleId] });
  return {
    id: String(row.id), email: String(row.email), name: String(row.name), roleId,
    roleName: String(row.role_name), isActive: Boolean(row.is_active),
    sessionVersion: Number(row.session_version), mustChangePassword: Boolean(row.must_change_password),
    passwordHash: row.password_hash ? String(row.password_hash) : null,
    temporaryPasswordExpiresAt: row.temporary_password_expires_at ? String(row.temporary_password_expires_at) : null,
    permissions: roleId === 'owner' ? [...ADMIN_PERMISSIONS] : result.rows.map(r => String(r.permission) as AdminPermission),
  };
}

export async function findAdminAccount(id: string): Promise<AdminAccount | null> {
  const result = await getDb().execute({ sql: `${select} WHERE a.id=? LIMIT 1`, args: [id] });
  return result.rows[0] ? mapAccount(result.rows[0]) : null;
}

export async function findAdminAccountByEmail(email: string): Promise<AdminAccount | null> {
  const result = await getDb().execute({ sql: `${select} WHERE lower(a.email)=lower(?) LIMIT 1`, args: [email] });
  return result.rows[0] ? mapAccount(result.rows[0]) : null;
}

export async function listAdminAccounts() {
  const result = await getDb().execute(`${select} ORDER BY a.name COLLATE NOCASE`);
  return Promise.all(result.rows.map(mapAccount));
}

export async function listAdminRoles() {
  const roles = await getDb().execute('SELECT id, name, description, is_system FROM admin_roles ORDER BY is_system DESC, name');
  const permissions = await getDb().execute('SELECT role_id, permission FROM admin_role_permissions');
  return roles.rows.map(row => ({
    id: String(row.id), name: String(row.name), description: String(row.description),
    isSystem: Boolean(row.is_system),
    permissions: String(row.id) === 'owner' ? [...ADMIN_PERMISSIONS] : permissions.rows.filter(p => p.role_id === row.id).map(p => String(p.permission)),
  }));
}

export async function auditAdmin(actorId: string | null, action: string, subjectId?: string, detail?: string) {
  await getDb().execute(auditStatement(actorId, action, subjectId, detail));
}

export async function beginAdminOperation(actorId: string, action: string, subjectId?: string) {
  const id = createId();
  await getDb().execute({ sql: 'INSERT INTO admin_audit_log(id,actor_id,action,subject_id,detail,created_at) VALUES(?,?,?,?,NULL,?)', args: [id, actorId, `${action}.pending`, subjectId ?? null, nowIso()] });
  return id;
}

export async function finishAdminOperation(id: string, action: string, succeeded: boolean, detail?: string) {
  const result = await getDb().execute({ sql: 'UPDATE admin_audit_log SET action=?,detail=? WHERE id=? AND action=?', args: [succeeded ? action : `${action}.failed`, detail ?? null, id, `${action}.pending`] });
  if (!result.rowsAffected) throw new Error('Audit operation is missing or already completed.');
}

export async function settleAdminOperation(id: string, action: string, succeeded: boolean, detail?: string) {
  try { await finishAdminOperation(id, action, succeeded, detail); }
  catch (error) { console.error('Admin operation audit remains pending:', { id, action, error }); }
}

export function auditStatement(actorId: string | null, action: string, subjectId?: string, detail?: string) {
  return { sql: 'INSERT INTO admin_audit_log (id,actor_id,action,subject_id,detail,created_at) VALUES (?,?,?,?,?,?)', args: [createId(), actorId, action, subjectId ?? null, detail ?? null, nowIso()] };
}

export async function listAdminActivity(input: { page: number; q?: string; action?: string; actorId?: string }) {
  const page = Math.max(1, Math.min(100000, input.page));
  const filters: string[] = [];
  const args: Array<string | number> = [];
  if (input.q) {
    filters.push('(lower(l.action) LIKE ? OR lower(COALESCE(l.subject_id,\'\')) LIKE ? OR lower(COALESCE(l.detail,\'\')) LIKE ? OR lower(COALESCE(a.name,\'\')) LIKE ? OR lower(COALESCE(a.email,\'\')) LIKE ?)');
    args.push(...Array(5).fill(`%${input.q.toLowerCase()}%`));
  }
  if (input.action) { filters.push('l.action LIKE ?'); args.push(input.action === 'pending' || input.action === 'failed' ? `%.${input.action}` : `${input.action}.%`); }
  if (input.actorId) { filters.push('l.actor_id=?'); args.push(input.actorId); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const db = getDb();
  const count = await db.execute({ sql: `SELECT count(*) AS total FROM admin_audit_log l LEFT JOIN admins a ON a.id=l.actor_id ${where}`, args });
  const rows = await db.execute({ sql: `SELECT l.id,l.actor_id,l.action,l.subject_id,l.detail,l.created_at,a.name AS actor_name,a.email AS actor_email FROM admin_audit_log l LEFT JOIN admins a ON a.id=l.actor_id ${where} ORDER BY l.created_at DESC,l.id DESC LIMIT 30 OFFSET ?`, args: [...args, (page - 1) * 30] });
  return { items: rows.rows.map(row => ({ id: String(row.id), actorId: row.actor_id ? String(row.actor_id) : null, actorName: row.actor_name ? String(row.actor_name) : 'System', actorEmail: row.actor_email ? String(row.actor_email) : null, action: String(row.action), subjectId: row.subject_id ? String(row.subject_id) : null, detail: row.detail ? String(row.detail) : null, createdAt: String(row.created_at) })), total: Number(count.rows[0]?.total ?? 0), page, pageSize: 30 };
}

export async function countActiveOwners() {
  const result = await getDb().execute("SELECT count(*) AS count FROM admins WHERE role_id='owner' AND is_active=1");
  return Number(result.rows[0]?.count ?? 0);
}

export async function createAdminAccount(input: { name: string; email: string; roleId: string; hash: string }, actorId: string) {
  const id = createId();
  await getDb().batch([
    { sql: 'INSERT INTO admins (id,email,name,created_at,password_hash,role_id,is_active,session_version,must_change_password,temporary_password_expires_at) VALUES (?,?,?,?,?,?,1,0,1,?)', args: [id, input.email.toLowerCase(), input.name, nowIso(), input.hash, input.roleId, new Date(Date.now() + 86400000).toISOString()] },
    auditStatement(actorId, 'admin.created', id, input.roleId),
  ], 'write');
  return id;
}

export async function updateAdminAccount(id: string, input: { name?: string; roleId?: string; isActive?: boolean }, actorId: string) {
  const tx = await getDb().transaction('write');
  try {
    const rows = await tx.execute({ sql: 'SELECT name,role_id,is_active FROM admins WHERE id=?', args: [id] });
    const current = rows.rows[0];
    if (!current) { await tx.rollback(); return false; }
    if (current.role_id === 'owner' && Number(current.is_active) === 1 && (input.roleId && input.roleId !== 'owner' || input.isActive === false)) {
      const owners = await tx.execute("SELECT count(*) AS count FROM admins WHERE role_id='owner' AND is_active=1");
      if (Number(owners.rows[0]?.count ?? 0) <= 1) throw new Error('The last active Owner cannot be disabled or reassigned.');
    }
    await tx.execute({ sql: 'UPDATE admins SET name=?, role_id=?, is_active=?, session_version=session_version+1 WHERE id=?', args: [input.name ?? String(current.name), input.roleId ?? String(current.role_id), input.isActive === undefined ? Number(current.is_active) : Number(input.isActive), id] });
    await tx.execute(auditStatement(actorId, 'admin.updated', id, JSON.stringify(input)));
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; }
  return true;
}

export async function setAdminPassword(id: string, hash: string, actorId: string) {
  await getDb().batch([
    { sql: 'UPDATE admins SET password_hash=?, must_change_password=0, temporary_password_expires_at=NULL, password_changed_at=?, session_version=session_version+1 WHERE id=?', args: [hash, nowIso(), id] },
    auditStatement(actorId, actorId === id ? 'password.changed' : 'password.reset', id),
  ], 'write');
}

export async function resetAdminPassword(id: string, hash: string, actorId: string) {
  await getDb().batch([
    { sql: 'UPDATE admins SET password_hash=?, must_change_password=1, temporary_password_expires_at=?, session_version=session_version+1 WHERE id=?', args: [hash, new Date(Date.now() + 86400000).toISOString(), id] },
    auditStatement(actorId, 'password.reset', id),
  ], 'write');
}

export async function createAdminRole(input: { name: string; description: string; permissions: AdminPermission[] }, actorId: string) {
  const id = createId();
  const tx = await getDb().transaction('write');
  try {
    await tx.execute({ sql: 'INSERT INTO admin_roles (id,name,description,is_system,created_at) VALUES (?,?,?,0,?)', args: [id, input.name, input.description, nowIso()] });
    for (const permission of input.permissions) await tx.execute({ sql: 'INSERT INTO admin_role_permissions (role_id,permission) VALUES (?,?)', args: [id, permission] });
    await tx.execute(auditStatement(actorId, 'role.created', id, input.name));
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; }
  return id;
}

export async function updateAdminRole(id: string, input: { name: string; description: string; permissions: AdminPermission[] }, actorId: string) {
  if (id === 'owner') throw new Error('Owner permissions cannot be edited.');
  const tx = await getDb().transaction('write');
  try {
    const result = await tx.execute({ sql: 'UPDATE admin_roles SET name=?, description=? WHERE id=?', args: [input.name, input.description, id] });
    if (!result.rowsAffected) { await tx.rollback(); return false; }
    await tx.execute({ sql: 'DELETE FROM admin_role_permissions WHERE role_id=?', args: [id] });
    for (const permission of input.permissions) await tx.execute({ sql: 'INSERT INTO admin_role_permissions (role_id,permission) VALUES (?,?)', args: [id, permission] });
    await tx.execute({ sql: 'UPDATE admins SET session_version=session_version+1 WHERE role_id=?', args: [id] });
    await tx.execute(auditStatement(actorId, 'role.updated', id, input.name));
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; }
  return true;
}

export async function deleteAdminRole(id: string, actorId: string) {
  const tx = await getDb().transaction('write');
  try {
    const result = await tx.execute({ sql: 'DELETE FROM admin_roles WHERE id=? AND is_system=0 AND NOT EXISTS (SELECT 1 FROM admins WHERE role_id=?)', args: [id, id] });
    if (result.rowsAffected) await tx.execute(auditStatement(actorId, 'role.deleted', id));
    await tx.commit();
    return Boolean(result.rowsAffected);
  } catch (error) { await tx.rollback(); throw error; }
}
