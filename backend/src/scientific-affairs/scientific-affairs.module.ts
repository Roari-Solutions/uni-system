import { Module } from '@nestjs/common';
import { ScientificAffairsService } from './scientific-affairs.service';
import { ScientificAffairsController } from './scientific-affairs.controller';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { MediaModule } from 'src/media/media.module';

@Module({
  imports: [DatabaseModule, JwtModule, MediaModule],
  controllers: [ScientificAffairsController],
  providers: [ScientificAffairsService],
})
export class ScientificAffairsModule {}
