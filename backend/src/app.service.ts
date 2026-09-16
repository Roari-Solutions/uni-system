import { Injectable } from '@nestjs/common';

/** Provides the root greeting string. */
@Injectable()
export class AppService {
  /** Returns 'Hello World!'. */
  getHello(): string {
    return 'Hello World!';
  }
}
