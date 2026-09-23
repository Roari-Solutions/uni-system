import { PartialType } from '@nestjs/mapped-types';
import { CreateDeanshipCmDto } from './create-deanship-cm.dto';

export class UpdateDeanshipCmDto extends PartialType(CreateDeanshipCmDto) {}
