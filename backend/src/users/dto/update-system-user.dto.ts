import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemUserDto } from '@/users/dto/create-system-user.dto';

export class UpdateSystemUserDto extends PartialType(CreateSystemUserDto) {}
