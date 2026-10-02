import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from 'src/database/database.module';
import { MediaModule } from 'src/media/media.module';
import {
  SiteCmsController,
  SitePublicController,
} from './site-content.controller';
import { SiteContentService } from './site-content.service';

/** The website's content: what the site reads and what content managers edit. */
@Module({
  imports: [DatabaseModule, JwtModule, MediaModule],
  controllers: [SitePublicController, SiteCmsController],
  providers: [SiteContentService],
})
export class SiteContentModule {}
