import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(96)
  @ApiProperty({ description: 'Role name' })
  name: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @ApiProperty({ description: 'Role description' })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Image URL' })
  imageUrl?: string;
}
