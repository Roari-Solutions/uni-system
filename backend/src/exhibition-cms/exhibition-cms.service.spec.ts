import { Test, TestingModule } from '@nestjs/testing';
import { ExhibitionCmsService } from './exhibition-cms.service';

describe('ExhibitionCmsService', () => {
  let service: ExhibitionCmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExhibitionCmsService],
    }).compile();

    service = module.get<ExhibitionCmsService>(ExhibitionCmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
