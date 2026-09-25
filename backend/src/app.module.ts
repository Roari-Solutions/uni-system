import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ContentModule } from './content/content.module';
import { GradesModule } from './grades/grades.module';
import { StudentsModule } from './students/students.module';
import { CurriculumsModule } from './curriculums/curriculums.module';
import { FacultiesModule } from './faculties/faculties.module';
import { AdminModule } from './admin/admin.module';
import { GrGurdGuard } from './gr-gurd/gr-gurd.guard';
import { DeanshipCmsModule } from './deanship-cms/deanship-cms.module';
import { MainCmsModule } from './main-cms/main-cms.module';
import { ContactUsCmsModule } from './contact-us-cms/contact-us-cms.module';
import { ScientificAffairsModule } from './scientific-affairs/scientific-affairs.module';
import { AboutCmsModule } from './about-cms/about-cms.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ContentModule,
    GradesModule,
    StudentsModule,
    CurriculumsModule,
    FacultiesModule,
    AdminModule,
    AuthModule,
    DatabaseModule,
    DeanshipCmsModule,
    MainCmsModule,
    ContactUsCmsModule,
    ScientificAffairsModule,
    AboutCmsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService, GrGurdGuard],
})
/** Root module: global config plus auth/content/database. */
export class AppModule {}
