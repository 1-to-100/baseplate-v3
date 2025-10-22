import { ApiProperty } from '@nestjs/swagger';

export class OutputManagerDto {
  @ApiProperty({ description: 'ID Manager' })
  id: string;

  @ApiProperty({ description: 'Email Manager' })
  email: string;

  @ApiProperty({ description: 'Name Manager' })
  name?: string;
}
