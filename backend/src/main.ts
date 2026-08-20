import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/api/v1');
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:4000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true, // Enables Access-Control-Allow-Credentials: true
    maxAge: 86400, // Cache preflight for 24 hours})
  });

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap().catch((err) => {
  console.log(`some error happened ${err}`);
});
