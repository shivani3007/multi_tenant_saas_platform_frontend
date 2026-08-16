import { ROLES, type Role } from '../api/types';

/**
 * Roles and what each one can do.
 *
 * The permission table below is the source of truth — it is a direct
 * transcription of the access matrix, one row per capability, listing the roles
 * that hold it explicitly rather than inferring anything from role ordering.
 * That matters for `tenant:delete`: it belongs to Owner *alone*, which no
 * "Admin and above" style rank comparison can express.
 *
 *   Role    | View files | Upload / edit | Manage users | Delete tenant data
 *   --------|------------|---------------|--------------|-------------------
 *   Owner   |     ✓      |       ✓       |      ✓       |         ✓
 *   Admin   |     ✓      |       ✓       |      ✓       |         ✗
 *   Editor  |     ✓      |       ✓       |      ✗       |         ✗
 *   Viewer  |     ✓      |       ✗       |      ✗       |         ✗
 */

// ── Rank ────────────────────────────────────────────────────────────────────
// Ordering is still meaningful for one thing only: nobody may grant or edit a
// role above their own. It is deliberately NOT used for permission checks.

const RANK: Record<Role, number> = {
  Viewer: 0,
  Editor: 1,
  Admin: 2,
  Owner: 3,
};

export const ROLE_LABEL: Record<Role, string> = {
  Viewer: 'Viewer',
  Editor: 'Editor',
  Admin: 'Admin',
  Owner: 'Owner',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  Viewer: 'Can browse files and dashboards. Cannot upload or change anything.',
  Editor: 'Can view files and upload or edit them.',
  Admin: 'Everything an Editor can do, plus managing users and workspace settings.',
  Owner: 'Full control, including deleting workspace data.',
};

// ── Capabilities ────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  /** See the file list, previews and dashboards. */
  'files:view': ['Viewer', 'Editor', 'Admin', 'Owner'],
  /** Upload new files and edit existing ones. */
  'files:upload': ['Editor', 'Admin', 'Owner'],
  /** Invite people, change roles, remove members. */
  'users:manage': ['Admin', 'Owner'],
  /**
   * Destructive removal of the tenant's own data — deleting files, and any
   * future purge/reset action. Owner only.
   */
  'tenant:delete': ['Owner'],
  /**
   * Not in the supplied matrix: editing workspace settings (renaming, plan
   * details). Grouped with the Admin tier because it sits alongside user
   * management, and is non-destructive so it is not `tenant:delete`.
   */
  'tenant:settings': ['Admin', 'Owner'],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof PERMISSIONS;

export const CAPABILITY_LABEL: Record<Capability, string> = {
  'files:view': 'View files',
  'files:upload': 'Upload / edit',
  'users:manage': 'Manage users',
  'tenant:delete': 'Delete tenant data',
  'tenant:settings': 'Workspace settings',
};

/** The one question every guard and every conditional control should ask. */
export function can(role: Role | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (PERMISSIONS[capability] as readonly Role[]).includes(role);
}

/** Which roles hold a capability — used by the 403 page to explain the denial. */
export function rolesWith(capability: Capability): readonly Role[] {
  return PERMISSIONS[capability];
}

// ── Rank-based helpers (role assignment only) ───────────────────────────────

/**
 * `true` when `role` is at least as privileged as `minimum`.
 *
 * Reserved for role *assignment* rules, where the hierarchy genuinely applies.
 * Do not use it to gate a feature — use `can()`, so a capability that isn't
 * hierarchical (Owner-only actions) can't be silently widened.
 */
export function atLeast(role: Role | undefined, minimum: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[minimum];
}

/** Nobody may grant, or take away, a role ranked above their own. */
export function canAssignRole(actor: Role | undefined, target: Role): boolean {
  if (!can(actor, 'users:manage')) return false;
  return atLeast(actor, target);
}

/** The roles `actor` is allowed to hand out, in ascending order. */
export function assignableRoles(actor: Role | undefined): Role[] {
  return ROLES.filter((candidate) => canAssignRole(actor, candidate));
}
