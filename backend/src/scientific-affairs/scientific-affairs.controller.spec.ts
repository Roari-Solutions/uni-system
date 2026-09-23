import { Test, TestingModule } from '@nestjs/testing';
import { ScientificAffairsController } from './scientific-affairs.controller';
import { ScientificAffairsService } from './scientific-affairs.service';

describe('ScientificAffairsController', () => {
  let controller: ScientificAffairsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScientificAffairsController],
      providers: [ScientificAffairsService],
    }).compile();

    controller = module.get<ScientificAffairsController>(ScientificAffairsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
