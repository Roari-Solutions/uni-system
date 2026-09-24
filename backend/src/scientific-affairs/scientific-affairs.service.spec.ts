import { Test, TestingModule } from '@nestjs/testing';
import { ScientificAffairsService } from './scientific-affairs.service';

describe('ScientificAffairsService', () => {
  let service: ScientificAffairsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScientificAffairsService],
    }).compile();

    service = module.get<ScientificAffairsService>(ScientificAffairsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
