import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { MediaModule } from 'src/media/media.module';
import { MainCmsController } from './main-cms.controller';
import { MainCmsService } from './main-cms.service';

@Module({
  imports: [AuthModule, DatabaseModule, MediaModule],
  controllers: [MainCmsController],
  providers: [MainCmsService],
})
/** Landing page CMS: public GET, guarded PATCH with image uploads. */
export class MainCmsModule {}
