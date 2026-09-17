import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { DatabaseModule } from '../database/database.module';
import { StudenController } from './students.controller';
import { CurriculumController } from './curriculum.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [GradesController, StudenController, CurriculumController],
  providers: [GradesService],
  exports: [GradesService],
})
/** Wires the grades & results service. */
export class GradesModule {}
