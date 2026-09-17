import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
/** Wires the grades & results service. */
export class GradesModule {}
