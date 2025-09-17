import { ApiProperty } from '@nestjs/swagger';

export class OutputResetPasswortDto {
  @ApiProperty({ description: 'Status of the reset password request' })
  status: string;

  @ApiProperty({
    description: 'Message describing the result of the reset password request',
  })
  message: string;
}
