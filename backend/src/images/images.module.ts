import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ImagesService } from './images.service';

@Module({
  imports: [DatabaseModule],
  providers: [ImagesService],
  exports: [ImagesService],
})
/** Shared image storage for CMS page modules. */
export class ImagesModule {}
