import { Test, TestingModule } from '@nestjs/testing';
import { FacultiesDataService } from './faculties-data.service';

describe('FacultiesDataService', () => {
  let service: FacultiesDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FacultiesDataService],
    }).compile();

    service = module.get<FacultiesDataService>(FacultiesDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
