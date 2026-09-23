import { Module } from '@nestjs/common';
import { ScientificAffairsService } from './scientific-affairs.service';
import { ScientificAffairsController } from './scientific-affairs.controller';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [DatabaseModule, JwtModule],
  controllers: [ScientificAffairsController],
  providers: [ScientificAffairsService],
})
export class ScientificAffairsModule {}
