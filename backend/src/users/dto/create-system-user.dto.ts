import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserSystemRolesList } from '@/common/constants/user-system-roles';
import { CreateUserDto } from '@/users/dto/create-user.dto';

export class CreateSystemUserDto extends CreateUserDto {
  @ApiProperty({ description: 'User System Role' })
  @IsNotEmpty()
  @IsIn(UserSystemRolesList)
  systemRole: string;
}
