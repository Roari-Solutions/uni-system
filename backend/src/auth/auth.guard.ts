import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Request } from 'express';
import { config } from '../../config';

export interface JwtPayload {
  sub: string;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(
        req.cookies['access_token'] as string,
        { secret: config.jwtAccessSecret },
      );
    } catch {
      this.logger.warn('Access denied: expired, tampered, or missing token');
      throw new UnauthorizedException(); // expired, tampered, or missing token
    }

    req.user = payload;
    this.logger.debug(
      `Authenticated user ${payload.sub} (role: ${payload.role})`,
    );
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
