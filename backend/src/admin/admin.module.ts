import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AdminGuard } from './admin.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [UsersController],
  providers: [UsersService, AdminGuard],
  exports: [UsersService],
})
/** Wires admin-only user management. */
export class AdminModule {}
