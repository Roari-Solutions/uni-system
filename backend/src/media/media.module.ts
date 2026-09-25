import { Module } from '@nestjs/common';
import { MediaService } from './media.service';

@Module({
  providers: [MediaService],
  exports: [MediaService],
})
/** Shared CMS upload storage for images and PDFs. */
export class MediaModule {}
