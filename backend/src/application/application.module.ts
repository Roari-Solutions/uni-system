import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MediaModule } from 'src/media/media.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [DatabaseModule, MediaModule, JwtModule],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
