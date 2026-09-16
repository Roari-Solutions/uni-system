import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  createParamDecorator,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Request } from 'express';
import { config } from '../../config';

/** JWT payload carried on authenticated requests. */
export interface JwtPayload {
  sub: string;
  role: string;
}

/** Express request with the verified JWT payload attached. */
export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

/** Verifies the access_token cookie and attaches the payload. */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  /** Returns true when the request carries a valid access token. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(req.cookies['access_token'] as string, {
        secret: config.jwtAccessSecret,
      });
    } catch (error) {
      this.logger.warn('Access denied: expired, tampered, or missing token');
      throw new UnauthorizedException('Invalid or expired access token', {
        cause: error,
      }); // expired, tampered, or missing token
    }

    req.user = payload;
    this.logger.debug(`Authenticated user ${payload.sub} (role: ${payload.role})`);
    return true;
  }
}

/** Extracts the verified JWT payload inside guarded handlers. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
