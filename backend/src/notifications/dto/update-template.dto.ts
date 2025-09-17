import { PartialType } from '@nestjs/swagger';
import { CreateTemplateDto } from '@/notifications/dto/create-template.dto';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
