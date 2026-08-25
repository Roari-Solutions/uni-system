import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Logger } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { type Request, type Response } from 'express';
import { AuthGuard, CurrentUser } from './auth.guard';
import type { JwtPayload } from './auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`Login attempt for ${body.email}`);
    const tokens = await this.authService.login(body);
    this.authService.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Get('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refresh_token = req.cookies['refresh_token'] as string;
    if (!refresh_token) {
      this.logger.warn('Refresh attempt with no refresh_token cookie');
      throw new UnauthorizedException();
    }
    this.logger.log('Refreshing tokens');

    const tokens = await this.authService.refresh(refresh_token);

    this.authService.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    this.logger.log(`Fetching profile for user ${user.sub}`);
    return this.authService.me(user.sub);
  }
}
