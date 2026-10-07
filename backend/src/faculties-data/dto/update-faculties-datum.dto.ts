import { PartialType } from '@nestjs/mapped-types';
import { CreateFacultiesDatumDto } from './create-faculties-datum.dto';

export class UpdateFacultiesDatumDto extends PartialType(CreateFacultiesDatumDto) {}
