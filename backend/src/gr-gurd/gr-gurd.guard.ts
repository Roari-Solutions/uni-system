import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PERMISSIONS } from 'src/iam/permissions';
import { PermissionGuard, type AccessRequest } from 'src/iam/permission.guard';

/** Caller identity for /gr authorization. */
export interface GrCaller {
  /** Works across every faculty; otherwise pinned to facultyId. */
  allFaculties: boolean;
  /** Set for callers pinned to one faculty. */
  facultyId?: string;
  /** May lift a student's suspension or dismissal. */
  canReinstate: boolean;
}

/** Request carrying the verified user plus the guard-attached caller. */
export interface GrRequest extends AccessRequest {
  grCaller: GrCaller;
}

/** The /gr caller these permissions make; null when they may not enter grades. */
export function grCallerOf(
  permissions: ReadonlySet<string>,
  facultyId: string | null,
): GrCaller | null {
  if (!permissions.has(PERMISSIONS.grades)) return null;
  const canReinstate = permissions.has(PERMISSIONS.studentsReinstate);
  if (permissions.has(PERMISSIONS.gradesAllFaculties))
    return { allFaculties: true, canReinstate };
  // someone pinned to a faculty must have one
  if (!facultyId) return null;
  return { allFaculties: false, facultyId, canReinstate };
}

/**
 * Gate for /gr routes: the caller needs the grades domain, and unless they work
 * across faculties, a faculty of their own. Must run after AuthGuard.
 * Attaches req.grCaller; row-level checks live in the grades/students/curriculums services.
 */
@Injectable()
export class GrGurdGuard implements CanActivate {
  constructor(
    @Inject(PermissionGuard) private readonly permissionGuard: PermissionGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.permissionGuard.canActivate(context);
    const req = context.switchToHttp().getRequest<GrRequest>();

    const caller = grCallerOf(req.access.permissions, req.access.facultyId);
    if (!caller) throw new ForbiddenException();

    req.grCaller = caller;
    return true;
  }
}
