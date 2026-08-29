import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuthedRequest } from 'src/auth/auth.guard';
@Injectable()
export class DynamicContentGuard implements CanActivate {
  private readonly logger = new Logger(DynamicContentGuard.name);

  constructor() {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.user?.role || request.user?.role != 'site-content-employee') {
      this.logger.warn(
        `Content access denied for user ${request.user?.sub} (role: ${request.user?.role})`,
      );
      return false;
    }
    return true;
  }
}
