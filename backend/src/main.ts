import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { config as appConfig } from 'config';
import { MEDIA_IMAGES_DIR, MEDIA_PDFS_DIR } from './media/media.service';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // a website page is saved whole; the default 100kb leaves too little room for a long one
  app.useBodyParser('json', { limit: '1mb' });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 4000;

  app.use(cookieParser());
  // the website and the portals live on sibling subdomains and load media from here
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const details = errors.map((e) => ({
          field: e.property,
          constraints: e.constraints,
        }));
        logger.warn(`Validation failed: ${JSON.stringify(details)}`, 'ValidationPipe');

        const isMissing = errors.some((e) => e.constraints?.isNotEmpty || e.constraints?.isDefined);

        const code = isMissing ? 'MA' : 'PI'; // matches existing service codes

        return new BadRequestException({ code });
      },
    }),
  );
  app.setGlobalPrefix('/api/v1');

  // uploaded and seeded media, at the URLs the content stores (/images/<hash>.jpg)
  const media = {
    immutable: true,
    maxAge: '365d',
    index: false,
    fallthrough: false,
  } as const;
  app.useStaticAssets(MEDIA_IMAGES_DIR, { prefix: '/images/', ...media });
  app.useStaticAssets(MEDIA_PDFS_DIR, { prefix: '/pdfs/', ...media });

  app.enableCors({
    origin: appConfig.corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
    maxAge: 86400,
  });

  await app.listen(port, () => {
    logger.log(`app on port ${port}`);
  });
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Fatal startup error', err);
  process.exit(1);
});
