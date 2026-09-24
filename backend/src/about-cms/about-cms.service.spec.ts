import { Test, TestingModule } from '@nestjs/testing';
import { AboutCmsService } from './about-cms.service';

describe('AboutCmsService', () => {
  let service: AboutCmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AboutCmsService],
    }).compile();

    service = module.get<AboutCmsService>(AboutCmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
