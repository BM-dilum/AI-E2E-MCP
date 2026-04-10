import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const portEnv = process.env.PORT;
  const parsedPort = portEnv === undefined ? NaN : Number(portEnv);
  const port = Number.isInteger(parsedPort) && parsedPort >= 0 ? parsedPort : 3000;
  await app.listen(port);
}

void bootstrap();