import { Test, TestingModule } from '@nestjs/testing';
import { AboutCmsController } from './about-cms.controller';
import { AboutCmsService } from './about-cms.service';

describe('AboutCmsController', () => {
  let controller: AboutCmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AboutCmsController],
      providers: [AboutCmsService],
    }).compile();

    controller = module.get<AboutCmsController>(AboutCmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
