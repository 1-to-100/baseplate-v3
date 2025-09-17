import { PartialType } from '@nestjs/swagger';
import { CreateManagerDto } from '@/managers/dto/create-manager.dto';

export class UpdateManagerDto extends PartialType(CreateManagerDto) {}
