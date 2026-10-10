import { PartialType } from '@nestjs/mapped-types';
import { ApplicationUpdateDto } from './create-application.dto';

export class UpdateApplicationDto extends PartialType(ApplicationUpdateDto) {}
