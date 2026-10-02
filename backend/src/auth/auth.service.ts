import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { DATABASE, type Db } from 'src/database/database.module';
import * as schema from 'schema';
import { eq } from 'drizzle-orm';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { config } from 'config';
import ms, { StringValue } from 'ms';
import { Response } from 'express';
import { JwtPayload } from './auth.guard';
import { AccessService } from 'src/iam/access.service';
import { canEnter, portalsFor } from 'src/iam/portals';

type AuthTokens = { accessToken: string; refreshToken: string };

const BCRYPT_ROUNDS = 10;

/** Login/refresh/profile plus JWT cookie handling. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AccessService) private readonly accessService: AccessService,
  ) {}

  /**
   * Validates credentials and that the user may sign in at this portal. A user
   * at the wrong portal gets the same 401 as a wrong password, so a form never
   * tells anyone which accounts exist; the reason goes to the log only.
   */
  async login(body: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, body.email),
      columns: { id: true, password: true, suspended: true },
    });

    if (!user) {
      this.logger.warn(`Login failed: unknown email ${body.email}`);
      throw new UnauthorizedException();
    }

    if (user.suspended) {
      this.logger.warn(`Login blocked: suspended user ${user.id}`);
      throw new UnauthorizedException();
    }

    if (!(await bcrypt.compare(body.password, user.password))) {
      this.logger.warn(`Login failed: bad password for ${body.email}`);
      throw new UnauthorizedException();
    }

    // read fresh: a role may have changed since this user was last seen
    this.accessService.forget(user.id);
    const access = await this.accessService.load(user.id);
    if (!access || !canEnter(body.portal, access.permissions)) {
      this.logger.warn(
        `Login blocked: user ${user.id} may not use the ${body.portal} portal`,
      );
      throw new UnauthorizedException();
    }

    this.logger.log(
      `Login success: user ${user.id} at the ${body.portal} portal`,
    );

    const tokens = await this.issueTokens({ sub: user.id });
    return { tokens, portals: portalsFor(access.permissions) };
  }

  /** Signs a fresh access/refresh token pair for the payload. */
  async issueTokens(user: JwtPayload): Promise<AuthTokens> {
    const payload = { sub: user.sub };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: config.jwtAccessSecret,
        expiresIn: config.jwtAccessTtl as StringValue,
      }),
      this.jwt.signAsync(payload, {
        secret: config.jwtRefreshSecret,
        expiresIn: config.jwtRefreshTtl as StringValue,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  /** Rotates tokens from a refresh token; throws UnauthorizedException. */
  async refresh(token: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: config.jwtRefreshSecret,
      });
    } catch (error) {
      this.logger.warn('Refresh failed: invalid or expired refresh token');
      throw new UnauthorizedException('Invalid or expired refresh token', {
        cause: error,
      });
    }

    const access = await this.accessService.load(payload.sub);
    if (!access || portalsFor(access.permissions).length === 0) {
      this.logger.warn(
        `Refresh blocked: user ${payload.sub} is gone, suspended or has no roles`,
      );
      throw new UnauthorizedException();
    }

    return this.issueTokens({ sub: access.userId });
  }

  /**
   * Returns the safe profile (no password hash) plus the caller's roles,
   * permissions and the portals they may open; the views branch on these.
   */
  async me(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { password: false },
    });
    if (!user) {
      this.logger.warn(`me: user ${userId} not found`);
      throw new NotFoundException();
    }

    const access = await this.accessService.load(userId);
    if (!access) {
      this.logger.warn(`me: forbidden for suspended user ${userId}`);
      throw new ForbiddenException();
    }

    return {
      ...user,
      roles: access.roles,
      permissions: [...access.permissions].sort(),
      portals: portalsFor(access.permissions),
    };
  }

  /**
   * Updates the caller's own name, login and password. Any change needs the
   * current password. A wrong one is WRONG_PASSWORD (400, not 401: a 401 would
   * read as an expired session), and a login someone else holds is 409.
   */
  async updateAccount(userId: string, dto: UpdateAccountDto) {
    const { currentPassword, ...changes } = dto;
    // the validated body carries omitted fields as undefined, so count only real values
    if (!Object.values(changes).some((v) => v !== undefined)) throw new BadRequestException();

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { id: true, email: true, password: true, suspended: true },
    });
    if (!user) throw new NotFoundException();
    if (user.suspended) throw new ForbiddenException();

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      this.logger.warn(`Account update refused: wrong current password for ${user.id}`);
      throw new BadRequestException({ code: 'WRONG_PASSWORD' });
    }

    const email = changes.email?.trim();
    if (email !== undefined && email !== user.email) {
      const clash = await this.db.query.users.findFirst({
        where: eq(schema.users.email, email),
        columns: { id: true },
      });
      if (clash) throw new ConflictException();
    }

    await this.db
      .update(schema.users)
      .set({
        ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(changes.newPassword !== undefined
          ? { password: await bcrypt.hash(changes.newPassword, BCRYPT_ROUNDS) }
          : {}),
      })
      .where(eq(schema.users.id, user.id));

    this.logger.log(`User ${user.id} updated their own account`);
    return this.me(user.id);
  }

  /** Clears the auth cookies; the client cannot, since they are HttpOnly. */
  clearAuthCookies(res: Response) {
    const isSecure = config.cookieSecure;
    const options = { httpOnly: true, secure: isSecure, sameSite: 'strict' as const };
    res.clearCookie('access_token', options);
    res.clearCookie('refresh_token', options);
  }

  /** Writes access/refresh tokens as HttpOnly cookies. */
  setAuthCookies(res: Response, { accessToken, refreshToken }: AuthTokens) {
    const isSecure = config.cookieSecure;
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge: ms(config.jwtAccessTtl as StringValue) ?? 30 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge:
        ms(config.jwtRefreshTtl as StringValue) ?? 7 * 24 * 60 * 60 * 1000,
    });
  }
}
