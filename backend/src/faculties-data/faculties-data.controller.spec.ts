import { Test, TestingModule } from '@nestjs/testing';
import { FacultiesDataController } from './faculties-data.controller';
import { FacultiesDataService } from './faculties-data.service';

describe('FacultiesDataController', () => {
  let controller: FacultiesDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacultiesDataController],
      providers: [FacultiesDataService],
    }).compile();

    controller = module.get<FacultiesDataController>(FacultiesDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
