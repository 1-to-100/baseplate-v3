import { IsString, IsUUID, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  customer_id: string;

  @IsString()
  @IsNotEmpty()
  stripe_subscription_id: string;

  @IsString()
  @IsNotEmpty()
  stripe_status: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  collection_method?: string;

  @IsString()
  @IsOptional()
  current_period_start?: string;

  @IsString()
  @IsOptional()
  current_period_end?: string;

  @IsString()
  @IsOptional()
  trial_start?: string;

  @IsString()
  @IsOptional()
  trial_end?: string;

  @IsBoolean()
  @IsOptional()
  cancel_at_period_end?: boolean;

  @IsString()
  @IsOptional()
  canceled_at?: string;

  @IsString()
  @IsOptional()
  default_payment_method?: string;

  @IsString()
  @IsOptional()
  latest_invoice?: string;

  @IsObject()
  @IsOptional()
  stripe_metadata?: Record<string, any>;

  @IsObject()
  @IsOptional()
  stripe_raw_data?: Record<string, any>;
}

