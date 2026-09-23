import { Test, TestingModule } from '@nestjs/testing';
import { ContactUsCmsController } from './contact-us-cms.controller';
import { ContactUsCmsService } from './contact-us-cms.service';

describe('ContactUsCmsController', () => {
  let controller: ContactUsCmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactUsCmsController],
      providers: [ContactUsCmsService],
    }).compile();

    controller = module.get<ContactUsCmsController>(ContactUsCmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
