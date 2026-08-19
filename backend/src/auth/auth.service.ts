import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  login(body: CreateAuthDto) {
    console.log(body);

    return 'user logged in';
  }

  refresh() {
    return 'tokens refreshed';
  }
  me() {
    return 'you';
  }
}
