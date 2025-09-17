import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendInviteUserDto {
  @IsEmail()
  @ApiProperty({ description: 'Email address' })
  email: string;
}
