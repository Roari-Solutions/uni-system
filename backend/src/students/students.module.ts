import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { GradesModule } from '../grades/grades.module';

@Module({
  imports: [DatabaseModule, JwtModule, GradesModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
/** Wires the students service. */
export class StudentsModule {}
