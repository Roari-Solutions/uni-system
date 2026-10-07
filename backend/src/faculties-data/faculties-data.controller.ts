import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FacultiesDataService } from './faculties-data.service';
import { CreateFacultiesDatumDto } from './dto/create-faculties-datum.dto';
import { UpdateFacultiesDatumDto } from './dto/update-faculties-datum.dto';

@Controller('faculties-data')
export class FacultiesDataController {
  constructor(private readonly facultiesDataService: FacultiesDataService) {}
  @Get()
  findAll() {
    return this.facultiesDataService.findAll();
  }
}
