import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ContentModule } from './content/content.module';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ContentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
