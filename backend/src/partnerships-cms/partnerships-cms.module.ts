import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { PartnershipsCmsController } from './partnerships-cms.controller';
import { PartnershipsCmsService } from './partnerships-cms.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PartnershipsCmsController],
  providers: [PartnershipsCmsService],
})
export class PartnershipsCmsModule {}
