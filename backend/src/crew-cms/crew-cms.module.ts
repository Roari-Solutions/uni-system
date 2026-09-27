import { Module } from '@nestjs/common';
import { CrewCmsService } from './crew-cms.service';
import { CrewCmsController } from './crew-cms.controller';

@Module({
  controllers: [CrewCmsController],
  providers: [CrewCmsService],
})
export class CrewCmsModule {}
