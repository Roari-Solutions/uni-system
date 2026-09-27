import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { CrewCmsService } from './crew-cms.service';
import { CreateCrewCmDto } from './dto/create-crew-cm.dto';
import { UpdateCrewCmDto } from './dto/update-crew-cm.dto';

@Controller('crew-cms')
export class CrewCmsController {
  constructor(private readonly crewCmsService: CrewCmsService) {}

  @Get()
  findAll() {
    throw new NotFoundException();
  }

  @Patch()
  updatenotfount() {
    throw new NotFoundException();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crewCmsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCrewCmDto: UpdateCrewCmDto) {
    return this.crewCmsService.update(+id, updateCrewCmDto);
  }

}
