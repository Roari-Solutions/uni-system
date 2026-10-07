import { Inject, Injectable } from '@nestjs/common';
import { CreateFacultiesDatumDto } from './dto/create-faculties-datum.dto';
import { UpdateFacultiesDatumDto } from './dto/update-faculties-datum.dto';
import { DATABASE, type Db } from 'src/database/database.module';

@Injectable()
export class FacultiesDataService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}
  async findAll() {
    const rows = await this.db.query.faculties.findMany({
      with: { departments: { with: { specializations: true } } },
    });
    return rows;
  }
}
