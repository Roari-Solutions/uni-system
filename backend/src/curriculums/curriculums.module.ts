import { Module } from '@nestjs/common';
import { CurriculumsService } from './curriculums.service';
import { CurriculumController } from './curriculum.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CurriculumController],
  providers: [CurriculumsService],
  exports: [CurriculumsService],
})
/** Wires the curriculums service. */
export class CurriculumsModule {}
