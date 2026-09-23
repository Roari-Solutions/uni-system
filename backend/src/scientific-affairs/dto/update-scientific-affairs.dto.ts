import { PartialType } from '@nestjs/mapped-types';
import { CreateScientificAffairsDto } from './create-scientific-affairs.dto';

export class UpdateScientificAffairsDto extends PartialType(CreateScientificAffairsDto) {}
