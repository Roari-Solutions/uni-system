import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { MediaModule } from 'src/media/media.module';
import { FacultyCmsController } from './faculty-cms.controller';
import { FacultyCmsService } from './faculty-cms.service';

@Module({
  imports: [AuthModule, DatabaseModule, MediaModule],
  controllers: [FacultyCmsController],
  providers: [FacultyCmsService],
})
/** Wires per-faculty CMS controller/service with auth/database/images. */
export class FacultyCmsModule {}
