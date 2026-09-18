import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthedRequest } from 'src/auth/auth.guard';

/** The role that may manage users. */
export const ADMIN_ROLE = 'admin';

/**
 * Admin-only gate for /admin routes.
 * Must run after AuthGuard: it relies on req.user being set.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    if (!req.user) throw new UnauthorizedException();

    if (req.user.role !== ADMIN_ROLE) {
      this.logger.warn(
        `Admin access denied for user ${req.user.sub} (role: ${req.user.role})`,
      );
      throw new UnauthorizedException();
    }

    return true;
  }
}
