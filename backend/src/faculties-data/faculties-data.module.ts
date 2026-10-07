import { Module } from '@nestjs/common';
import { FacultiesDataService } from './faculties-data.service';
import { FacultiesDataController } from './faculties-data.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FacultiesDataController],
  providers: [FacultiesDataService],
})
export class FacultiesDataModule {}
