import { Module } from '@nestjs/common';
import { CrewCmsService } from './crew-cms.service';
import { CrewCmsController } from './crew-cms.controller';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from 'src/auth/auth.module';
import { MediaModule } from 'src/media/media.module';

@Module({
  imports: [AuthModule, DatabaseModule, MediaModule],
  controllers: [CrewCmsController],
  providers: [CrewCmsService],
})
export class CrewCmsModule {}
