import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  validateSync,
  IsEnum,
} from 'class-validator';
import { Providers } from 'src/ai/ai.service';

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  GITHUB_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_OWNER: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_REPO: string;

  @IsString()
  @IsNotEmpty()
  GROQ_API_KEY: string;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsEnum(Providers)
  @IsOptional()
  AI_PROVIDER: Providers = Providers.openai;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}
