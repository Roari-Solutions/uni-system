import { Module } from '@nestjs/common';
import { FacultiesDataService } from './faculties-data.service';
import { FacultiesDataController } from './faculties-data.controller';

@Module({
  controllers: [FacultiesDataController],
  providers: [FacultiesDataService],
})
export class FacultiesDataModule {}
