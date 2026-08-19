import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: CreateAuthDto) {
    return this.authService.login(body);
  }
  @Get('refresh')
  refresh() {
    return this.authService.refresh();
  }

  @Get('me')
  me() {
    return this.authService.me();
  }
}
