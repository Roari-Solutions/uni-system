import { Test, TestingModule } from '@nestjs/testing';
import { ContactUsCmsService } from './contact-us-cms.service';

describe('ContactUsCmsService', () => {
  let service: ContactUsCmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactUsCmsService],
    }).compile();

    service = module.get<ContactUsCmsService>(ContactUsCmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
