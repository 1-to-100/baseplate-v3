import { ApiPropertyOptional } from '@nestjs/swagger';
import { OutputUserDto } from './output-user.dto';

export class UserWithImpersonationDto extends OutputUserDto {
  @ApiPropertyOptional({
    description: 'Indicates if the current request is being impersonated',
    example: false,
  })
  isImpersonating?: boolean;

  @ApiPropertyOptional({
    description:
      'Information about the impersonating user (only present when impersonating)',
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Impersonating user ID' },
      email: { type: 'string', description: 'Impersonating user email' },
      firstName: {
        type: 'string',
        description: 'Impersonating user first name',
      },
      lastName: { type: 'string', description: 'Impersonating user last name' },
    },
  })
  impersonatedBy?: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}
