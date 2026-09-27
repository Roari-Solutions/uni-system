import { PartialType } from '@nestjs/mapped-types';
import { CreateCrewCmDto } from './create-crew-cm.dto';

export class UpdateCrewCmDto extends PartialType(CreateCrewCmDto) {}
