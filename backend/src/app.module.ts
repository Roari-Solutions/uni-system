import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { GradesModule } from './grades/grades.module';
import { StudentsModule } from './students/students.module';
import { CurriculumsModule } from './curriculums/curriculums.module';
import { FacultiesModule } from './faculties/faculties.module';
import { AdminModule } from './admin/admin.module';
import { GrGurdGuard } from './gr-gurd/gr-gurd.guard';
import { MediaModule } from './media/media.module';
import { IamModule } from './iam/iam.module';
import { SiteContentModule } from './site-content/site-content.module';
import { ResultsModule } from './results/results.module';
import { FacultiesDataModule } from './faculties-data/faculties-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    IamModule,
    GradesModule,
    StudentsModule,
    CurriculumsModule,
    ResultsModule,
    FacultiesModule,
    AdminModule,
    AuthModule,
    DatabaseModule,
    MediaModule,
    SiteContentModule,
    FacultiesDataModule,
  ],
  controllers: [AppController],
  providers: [AppService, GrGurdGuard],
})
/** Root module: global config, auth and roles, the grades system and website content. */
export class AppModule {}
