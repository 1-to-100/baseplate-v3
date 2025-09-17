import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

const nodeEnvironments = ['development', 'production', 'test'] as const;
type NodeEnvironment = (typeof nodeEnvironments)[number];

class EnvironmentVariables {
  @IsEnum(nodeEnvironments)
  NODE_ENV: NodeEnvironment = 'development';

  @IsNumber()
  @IsNotEmpty()
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  DIRECT_URL?: string;

  // @IsString()
  // @IsNotEmpty()
  // DATABASE_USER: string;
  //
  // @IsString()
  // @IsNotEmpty()
  // DATABASE_PASSWORD: string;
  //
  // @IsString()
  // @IsNotEmpty()
  // DATABASE_NAME: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_JWT_SECRET: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  SUPABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_ROLE_KEY: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  FRONTEND_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
