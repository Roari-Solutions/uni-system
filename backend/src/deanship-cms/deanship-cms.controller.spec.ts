import { Test, TestingModule } from '@nestjs/testing';
import { DeanshipCmsController } from './deanship-cms.controller';

describe('DeanshipCmsController', () => {
  let controller: DeanshipCmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeanshipCmsController],
    }).compile();

    controller = module.get<DeanshipCmsController>(DeanshipCmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
