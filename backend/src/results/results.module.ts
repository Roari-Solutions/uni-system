import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [ResultsController],
  providers: [ResultsService],
})
/** Wires the batch results service. */
export class ResultsModule {}
