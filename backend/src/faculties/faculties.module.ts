import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { FacultiesController } from './faculties.controller';
import { FacultiesService } from './faculties.service';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [FacultiesController],
  providers: [FacultiesService],
  exports: [FacultiesService],
})
/** Wires the faculties lookup service. */
export class FacultiesModule {}
