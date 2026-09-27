import { Test, TestingModule } from '@nestjs/testing';
import { CrewCmsController } from './crew-cms.controller';
import { CrewCmsService } from './crew-cms.service';

describe('CrewCmsController', () => {
  let controller: CrewCmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrewCmsController],
      providers: [CrewCmsService],
    }).compile();

    controller = module.get<CrewCmsController>(CrewCmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
