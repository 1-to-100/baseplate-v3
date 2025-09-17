import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'First Name' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Last Name' })
  lastName: string;

  @IsEmail()
  @ApiProperty({ description: 'Email address' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Password' })
  password: string;
}
