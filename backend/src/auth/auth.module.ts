import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { ApplicantGuard } from './applicant.guard';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, ApplicantGuard],
  exports: [AuthGuard, ApplicantGuard, JwtModule],
})
/** Wires auth endpoints, guard, and JWT support. */
export class AuthModule {}
