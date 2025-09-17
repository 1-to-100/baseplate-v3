import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CheckUserExistsDto {
  @IsEmail()
  @ApiProperty({ description: 'Email address' })
  @IsNotEmpty()
  email: string;
}
