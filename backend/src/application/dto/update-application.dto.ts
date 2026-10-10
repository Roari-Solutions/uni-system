import { PartialType } from '@nestjs/mapped-types';
import { ApplicationDto } from './create-application.dto';

export class UpdateApplicationDto extends PartialType(ApplicationDto) {}
