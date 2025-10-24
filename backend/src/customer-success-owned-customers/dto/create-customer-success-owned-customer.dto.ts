import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateCustomerSuccessOwnedCustomerDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  customer_id: string;
}

