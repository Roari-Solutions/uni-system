import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Logger } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { type Request, type Response } from 'express';
import { AuthGuard, CurrentUser } from './auth.guard';
import type { JwtPayload } from './auth.guard';

/** Login/refresh/profile endpoints. */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  /** POST /auth/login — validates credentials, sets auth cookies. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`Login attempt for ${body.email}`);
    const tokens = await this.authService.login(body);
    this.authService.setAuthCookies(res, tokens);
  }

  /** GET /auth/refresh — rotates tokens from the refresh cookie. */
  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'] as string;
    if (!refreshToken) {
      this.logger.warn('Refresh attempt with no refresh_token cookie');
      throw new UnauthorizedException();
    }
    this.logger.log('Refreshing tokens');

    const tokens = await this.authService.refresh(refreshToken);

    this.authService.setAuthCookies(res, tokens);
  }

  /** GET /auth/me — returns the current user's safe profile. */
  @UseGuards(AuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: JwtPayload) {
    this.logger.log(`Fetching profile for user ${user.sub}`);
    return await this.authService.me(user.sub);
  }
}
