import { Module } from '@nestjs/common';
import { CurriculumsService } from './curriculums.service';
import { CurriculumController } from './curriculum.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [CurriculumController],
  providers: [CurriculumsService],
  exports: [CurriculumsService],
})
/** Wires the curriculums service. */
export class CurriculumsModule {}
