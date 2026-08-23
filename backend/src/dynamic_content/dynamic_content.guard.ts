import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { config } from 'config';
import { AuthedRequest, JwtPayload } from 'src/auth/auth.guard';
@Injectable()
export class DynamicContentGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const access_token = request.cookies['access_token'] as string;

    const payload = await this.jwt.verifyAsync<JwtPayload>(access_token, {
      secret: config.jwtAccessSecret,
    });

    if (payload.role != 'site-content-employee') return false;

    return true;
  }
}
