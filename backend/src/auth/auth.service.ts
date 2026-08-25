import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { DATABASE, type Db } from '../database/database.module';
import * as schema from '../../schema';
import { eq } from 'drizzle-orm';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { config } from '../../config';
import ms, { StringValue } from 'ms';
import { Response } from 'express';
import { JwtPayload } from './auth.guard';

type AuthTokens = { access_token: string; refresh_token: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    private readonly jwt: JwtService,
  ) {}

  async login(body: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, body.email),
      with: {
        employee: { with: { role: { columns: { name: true } } }, columns: {} },
      },
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

    if (!user.employee?.role) {
      this.logger.warn(`Login blocked: user ${user.id} has no employee role`);
      throw new UnauthorizedException();
    }

    this.logger.log(`Login success: user ${user.id}`);

    const { access_token, refresh_token } = await this.issue_tokens({
      sub: user.id,
      role: user.employee.role.name,
    });
    return { access_token, refresh_token };
  }

  async issue_tokens(user: JwtPayload): Promise<AuthTokens> {
    const payload = {
      sub: user.sub,
      role: user.role,
    };
    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: config.jwtAccessSecret,
        expiresIn: config.jwtAccessTtl as StringValue,
      }),
      this.jwt.signAsync(payload, {
        secret: config.jwtRefreshSecret,
        expiresIn: config.jwtRefreshTtl as StringValue,
      }),
    ]);
    return { access_token, refresh_token };
  }

  async refresh(token: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: config.jwtRefreshSecret,
      });
    } catch {
      this.logger.warn('Refresh failed: invalid or expired refresh token');
      throw new UnauthorizedException();
    }

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, payload.sub),
      with: {
        employee: { columns: {}, with: { role: { columns: { name: true } } } },
      },
    });
    if (!user) {
      this.logger.warn(`Refresh failed: user ${payload.sub} not found`);
      throw new UnauthorizedException();
    }

    if (user.suspended) {
      this.logger.warn(`Refresh blocked: suspended user ${user.id}`);
      throw new UnauthorizedException();
    }

    if (!user.employee?.role) {
      this.logger.warn(`Refresh blocked: user ${user.id} has no employee role`);
      throw new UnauthorizedException();
    }

    return this.issue_tokens({ sub: user.id, role: user.employee.role.name });
  }

  async me(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user) {
      this.logger.warn(`me: user ${userId} not found`);
      throw new NotFoundException();
    }
    if (user.suspended) {
      this.logger.warn(`me: forbidden for suspended user ${userId}`);
      throw new ForbiddenException();
    }

    const { password: _password, ...safe } = user;
    return safe;
  }

  setAuthCookies(res: Response, { access_token, refresh_token }: AuthTokens) {
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge: ms(config.jwtAccessTtl as StringValue) ?? 30 * 60 * 1000,
    });
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge:
        ms(config.jwtRefreshTtl as StringValue) ?? 7 * 24 * 60 * 60 * 1000,
    });
  }
}
