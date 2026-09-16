import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/** Default root controller (health-check greeting). */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** GET / — returns the greeting. */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
