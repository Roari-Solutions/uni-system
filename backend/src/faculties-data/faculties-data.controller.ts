import { Controller, Get } from '@nestjs/common';
import { FacultiesDataService } from './faculties-data.service';

@Controller('faculties-data')
export class FacultiesDataController {
  constructor(private readonly facultiesDataService: FacultiesDataService) {}
  @Get()
  findAll() {
    return this.facultiesDataService.findAll();
  }
}
