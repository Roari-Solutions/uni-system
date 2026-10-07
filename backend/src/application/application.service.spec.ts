import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { DATABASE } from 'src/database/database.module';

describe('ApplicationService', () => {
  let service: ApplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApplicationService, { provide: DATABASE, useValue: {} }],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
