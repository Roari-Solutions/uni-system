import { BadRequestException } from '@nestjs/common';
import { parseMainPageContent } from './main-page.dto';

const analytics = {
  researchCenters: 1,
  employeesNumber: 2,
  collegeCount: 3,
  studentsCount: 4,
  femaleStudents: 5,
  maleStudents: 6,
};

describe('parseMainPageContent', () => {
  it('returns undefined when the body carries no content', () => {
    expect(parseMainPageContent(undefined)).toBeUndefined();

    expect(parseMainPageContent({})).toBeUndefined();

    expect(parseMainPageContent({ content: '' })).toBeUndefined();

    expect(parseMainPageContent({ content: '{}' })).toBeUndefined();
  });

  it('parses the multipart content field', () => {
    const dto = parseMainPageContent({ content: JSON.stringify({ analytics }) });

    expect(dto?.analytics).toEqual(analytics);
  });

  it('accepts a raw json body', () => {
    const dto = parseMainPageContent({ analytics });

    expect(dto?.analytics?.studentsCount).toBe(4);
  });

  it('rejects malformed json with PI', () => {
    const run = () => parseMainPageContent({ content: '{bad' });

    expect(run).toThrow(BadRequestException);

    try {
      run();
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'PI',
      });
    }
  });

  it('rejects unknown keys with PI', () => {
    const run = () => parseMainPageContent({ nope: 1 });

    expect(run).toThrow(BadRequestException);

    try {
      run();
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'PI',
      });
    }
  });

  it('rejects a sent section missing required fields with MA', () => {
    const run = () => parseMainPageContent({ heroSection: {} });

    expect(run).toThrow(BadRequestException);

    try {
      run();
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'MA',
      });
    }
  });
});
