import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 4000;

  app.use(cookieParser());
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
        logger.warn(
          `Validation failed: ${JSON.stringify(details)}`,
          'ValidationPipe',
        );

        const isMissing = errors.some(
          (e) => e.constraints?.isNotEmpty || e.constraints?.isDefined,
        );
        console.log(isMissing);

        const code = isMissing ? 'MA' : 'PI'; // matches existing service codes

        return new BadRequestException({ code, errors: details });
      },
    }),
  );
  app.setGlobalPrefix('/api/v1');
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:4000'],
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
