import { PartialType } from '@nestjs/mapped-types';
import { CreateContactUsCmDto } from './create-contact-us-cm.dto';

export class UpdateContactUsCmDto extends PartialType(CreateContactUsCmDto) {}
