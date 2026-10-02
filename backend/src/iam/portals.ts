import { PERMISSIONS, type Permission } from './permissions';

/**
 * The sign-in portals. Each domain's portal admits only the holders of its
 * permission; the general staff portal admits anyone with a staff domain and
 * sends them on. Students never sign in through the staff portal.
 */
export const PORTALS = {
  staff: null,
  grades: PERMISSIONS.grades,
  cms: PERMISSIONS.cms,
  management: PERMISSIONS.management,
  teachers: PERMISSIONS.teachers,
  students: PERMISSIONS.students,
  lms: PERMISSIONS.lms,
} as const satisfies Record<string, Permission | null>;

export type Portal = keyof typeof PORTALS;

export const PORTAL_KEYS = Object.keys(PORTALS) as Portal[];

/** The domain portals, in the order a person with several is offered them. */
export const DOMAIN_PORTALS = PORTAL_KEYS.filter(
  (p): p is Exclude<Portal, 'staff'> => p !== 'staff',
);

/** The domain portals these permissions open. */
export function portalsFor(
  permissions: ReadonlySet<string>,
): Exclude<Portal, 'staff'>[] {
  return DOMAIN_PORTALS.filter((p) => permissions.has(PORTALS[p]));
}

/** Whether these permissions may sign in at this portal. */
export function canEnter(
  portal: Portal,
  permissions: ReadonlySet<string>,
): boolean {
  if (portal === 'staff')
    return portalsFor(permissions).some((p) => p !== 'students');
  return permissions.has(PORTALS[portal]);
}
