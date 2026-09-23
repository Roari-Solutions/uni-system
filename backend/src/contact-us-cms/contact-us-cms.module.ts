import { Module } from '@nestjs/common';
import { ContactUsCmsService } from './contact-us-cms.service';
import { ContactUsCmsController } from './contact-us-cms.controller';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ContactUsCmsController],
  providers: [ContactUsCmsService],
})
export class ContactUsCmsModule {}
