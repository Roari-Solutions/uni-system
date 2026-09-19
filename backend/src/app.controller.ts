import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './auth/auth.guard';
import { GrGurdGuard } from './gr-gurd/gr-gurd.guard';

/** Default root controller (health-check greeting). */
@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  /** GET / — returns the greeting. */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
