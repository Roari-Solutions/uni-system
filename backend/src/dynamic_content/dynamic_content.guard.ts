import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthedRequest } from 'src/auth/auth.guard';
@Injectable()
export class DynamicContentGuard implements CanActivate {
  constructor() {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.user?.role || request.user?.role != 'site-content-employee')
      return false;
    return true;
  }
}
