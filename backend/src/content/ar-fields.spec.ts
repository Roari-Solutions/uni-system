import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { HeroSectionDto } from 'src/main-cms/dto/main-page.dto';
import { AboutCertificateDto } from 'src/about-cms/dto/create-about-cm.dto';
import { SciResourceDto } from 'src/scientific-affairs/dto/create-scientific-affairs.dto';
import { CheckListDto } from 'src/deanship-cms/dto/create-deanship-cm.dto';
import { OpenTimeDto } from 'src/contact-us-cms/dto/create-contact-us-cm.dto';
import { FacultyProgramDto } from 'src/faculty-cms/dto/create-faculty-page.dto';

describe('arabic (_ar) fields', () => {
  it('accepts _ar siblings on the main hero section', () => {
    const dto = plainToInstance(HeroSectionDto, {
      mainHead: 'Main',
      mainHead_ar: 'الرئيسي',
      subHead: 'Sub',
      subHead_ar: 'الفرعي',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects a non-string _ar value', () => {
    const dto = plainToInstance(HeroSectionDto, {
      mainHead: 'Main',
      subHead: 'Sub',
      subHead_ar: 42,
    });

    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('keeps _ar fields through the faculty whitelist strip', () => {
    const dto = plainToInstance(FacultyProgramDto, {
      tag: 'BS',
      tag_ar: 'بكالوريوس',
      title: 'CS',
      subTitle: 'Bachelor',
      level: 'Bachelor',
      content: '...',
      hours: 132,
      track: 'General',
    });

    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: false })).toHaveLength(0);
    expect(dto.tag_ar).toBe('بكالوريوس');
  });

  it('accepts _ar siblings on about, scientific, deanship, and contact entries', () => {
    const cert = plainToInstance(AboutCertificateDto, {
      title: 'T',
      arTitle: 'ت',
      content: 'C',
      content_ar: 'م',
      tag: 'G',
      miniTag: 'M',
    });

    const resource = plainToInstance(SciResourceDto, {
      title: 'R',
      title_ar: 'مصدر',
      metadata: 'Meta',
    });

    const check = plainToInstance(CheckListDto, { name: 'N', name_ar: 'بند' });

    const time = plainToInstance(OpenTimeDto, {
      day: 'Monday',
      day_ar: 'الاثنين',
      start: '09:00',
      end: '17:00',
    });

    expect(validateSync(cert)).toHaveLength(0);
    expect(validateSync(resource)).toHaveLength(0);
    expect(validateSync(check)).toHaveLength(0);
    expect(validateSync(time)).toHaveLength(0);
  });
});
