import { Test, TestingModule } from '@nestjs/testing';
import { CrewCmsService } from './crew-cms.service';

describe('CrewCmsService', () => {
  let service: CrewCmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrewCmsService],
    }).compile();

    service = module.get<CrewCmsService>(CrewCmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
