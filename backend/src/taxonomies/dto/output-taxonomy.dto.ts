import { ApiProperty } from '@nestjs/swagger';

export class OutputTaxonomyDto {
  @ApiProperty({ description: 'ID' })
  id: number | null = null;

  @ApiProperty({ description: 'Name' })
  name: string | null = null;
}
