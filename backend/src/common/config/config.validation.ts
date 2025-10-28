import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  MinLength,
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
  @MinLength(32, {
    message: 'SUPABASE_JWT_SECRET must be at least 32 characters for security',
  })
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
    // Enhanced error message for better debugging
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'Unknown validation error';
        return `${error.property}: ${constraints}`;
      })
      .join('; ');

    throw new Error(
      `Environment configuration validation failed: ${errorMessages}`,
    );
  }

  return validatedConfig;
}
