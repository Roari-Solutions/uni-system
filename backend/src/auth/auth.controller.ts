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
import { CreateAuthDto } from './dto/create-auth.dto';
import { type Request, type Response } from 'express';
import { AuthGuard, CurrentUser } from './auth.guard';
import type { JwtPayload } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: CreateAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
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
    if (!refresh_token) throw new UnauthorizedException();

    const tokens = await this.authService.refresh(refresh_token);

    this.authService.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }
}
