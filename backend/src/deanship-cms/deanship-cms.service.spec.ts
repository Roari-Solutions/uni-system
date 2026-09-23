import { Test, TestingModule } from '@nestjs/testing';
import { DeanshipCmsService } from './deanship-cms.service';

describe('DeanshipCmsService', () => {
  let service: DeanshipCmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeanshipCmsService],
    }).compile();

    service = module.get<DeanshipCmsService>(DeanshipCmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
