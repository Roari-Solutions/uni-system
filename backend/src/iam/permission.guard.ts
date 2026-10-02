import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthedRequest } from 'src/auth/auth.guard';
import { AccessService, type Access } from './access.service';
import type { Permission } from './permissions';

const REQUIRED = 'required-permission';

/** Marks a controller or route as open only to holders of one of these permissions. */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED, permissions);

/** A request whose caller's access has been loaded. */
export interface AccessRequest extends AuthedRequest {
  access: Access;
}

/**
 * Checks the caller holds the route's permission and attaches their access.
 * Must run after AuthGuard: it relies on req.user being set.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessService) private readonly accessService: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AccessRequest>();
    if (!req.user) throw new UnauthorizedException();

    const access = await this.accessService.load(req.user.sub);
    // a deleted or suspended user's token is no longer a session
    if (!access) throw new UnauthorizedException();

    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRED,
      [context.getHandler(), context.getClass()],
    );
    if (required?.length && !required.some((p) => access.permissions.has(p))) {
      this.logger.warn(
        `Denied ${required.join(' or ')} to user ${access.userId}`,
      );
      throw new ForbiddenException();
    }

    req.access = access;
    return true;
  }
}
