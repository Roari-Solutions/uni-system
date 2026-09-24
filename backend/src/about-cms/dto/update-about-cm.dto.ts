import { PartialType } from '@nestjs/mapped-types';
import { CreateAboutCmDto } from './create-about-cm.dto';

export class UpdateAboutCmDto extends PartialType(CreateAboutCmDto) {}
