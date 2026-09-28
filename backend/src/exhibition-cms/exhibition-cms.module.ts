import { Module } from '@nestjs/common';
import { ExhibitionCmsService } from './exhibition-cms.service';
import { ExhibitionCmsController } from './exhibition-cms.controller';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { MediaModule } from 'src/media/media.module';

@Module({
  imports: [AuthModule, DatabaseModule, MediaModule],
  controllers: [ExhibitionCmsController],
  providers: [ExhibitionCmsService],
})
export class ExhibitionCmsModule {}
