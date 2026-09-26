import { Module } from '@nestjs/common';
import { AboutCmsService } from './about-cms.service';
import { AboutCmsController } from './about-cms.controller';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from 'src/auth/auth.module';
import { MediaModule } from 'src/media/media.module';

@Module({
  imports: [DatabaseModule, AuthModule, MediaModule],
  controllers: [AboutCmsController],
  providers: [AboutCmsService],
})
export class AboutCmsModule {}
