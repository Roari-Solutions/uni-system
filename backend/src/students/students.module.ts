import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
/** Wires the students service. */
export class StudentsModule {}
