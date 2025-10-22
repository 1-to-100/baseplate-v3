import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class OutputRoleDto {
  @ApiProperty({ description: 'Role ID' })
  id: string;

  @ApiProperty({ description: 'Role name' })
  name: string | null = null;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  description: string | null = null;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  imageUrl: string | null = null;

  @ApiProperty({
    description: 'Grouped permissions',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  })
  permissions: Record<
    string,
    Array<{ id: string; name: string; label: string }>
  >;
}
