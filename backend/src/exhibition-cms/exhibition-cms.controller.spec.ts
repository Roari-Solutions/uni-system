import { Test, TestingModule } from '@nestjs/testing';
import { ExhibitionCmsController } from './exhibition-cms.controller';
import { ExhibitionCmsService } from './exhibition-cms.service';

describe('ExhibitionCmsController', () => {
  let controller: ExhibitionCmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExhibitionCmsController],
      providers: [ExhibitionCmsService],
    }).compile();

    controller = module.get<ExhibitionCmsController>(ExhibitionCmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
