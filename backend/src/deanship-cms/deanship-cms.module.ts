import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { DeanshipCmsController } from './deanship-cms.controller';
import { DeanshipCmsService } from './deanship-cms.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DeanshipCmsController],
  providers: [DeanshipCmsService],
})
export class DeanshipCmsModule {}
