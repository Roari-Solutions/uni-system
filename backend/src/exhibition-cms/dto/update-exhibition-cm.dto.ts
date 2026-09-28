import { PartialType } from '@nestjs/mapped-types';
import { CreateExhibitionCmDto } from './create-exhibition-cm.dto';

export class UpdateExhibitionCmDto extends PartialType(CreateExhibitionCmDto) {}
