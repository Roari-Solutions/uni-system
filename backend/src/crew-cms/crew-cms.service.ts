import { Injectable } from '@nestjs/common';
import { CreateCrewCmDto } from './dto/create-crew-cm.dto';
import { UpdateCrewCmDto } from './dto/update-crew-cm.dto';

@Injectable()
export class CrewCmsService {
  create(createCrewCmDto: CreateCrewCmDto) {
    return 'This action adds a new crewCm';
  }

  findAll() {
    return `This action returns all crewCms`;
  }

  findOne(id: number) {
    return `This action returns a #${id} crewCm`;
  }

  update(id: number, updateCrewCmDto: UpdateCrewCmDto) {
    return `This action updates a #${id} crewCm`;
  }

  remove(id: number) {
    return `This action removes a #${id} crewCm`;
  }
}
