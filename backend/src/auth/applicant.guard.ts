import { CanActivate, ExecutionContext, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Request } from 'express';
import { config } from 'config';
import type { AuthedRequest, JwtPayload } from './auth.guard';

/** Verifies the applicant_access_token cookie and attaches the payload. */
@Injectable()
export class ApplicantGuard implements CanActivate {
  private readonly logger = new Logger(ApplicantGuard.name);

  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  /** Returns true when the request carries a valid applicant access token. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(req.cookies['applicant_access_token'] as string, {
        secret: config.jwtApplicantAccessSecret,
      });
    } catch (error) {
      this.logger.warn('Applicant access denied: expired, tampered, or missing token');
      throw new UnauthorizedException('Invalid or expired access token', {
        cause: error,
      }); // expired, tampered, or missing token
    }

    req.user = payload;
    this.logger.debug(`Authenticated applicant ${payload.sub}`);
    return true;
  }
}
