import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResetPasswortDto {
  @IsEmail()
  @ApiProperty({ description: 'Email address', required: true })
  email: string;
}
