import { mergeMainPage, type StoredFiles } from './main-cms.service';

const noFiles: StoredFiles = { newsPictureByIndex: {} };

const hero = {
  backgroundImages: ['/images/old.jpg'],
  mainHeading: 'Old',
  subHeading: 'Sub',
};

const analytics = {
  researchCenters: 1,
  employeesNumber: 2,
  collegeCount: 3,
  studentsCount: 4,
  femaleStudents: 5,
  maleStudents: 6,
};

describe('mergeMainPage', () => {
  it('replaces sent sections and keeps the rest', () => {
    const visionSection = { card: [{ title: 'V', content: 'C' }] };

    const merged = mergeMainPage({ heroSection: hero, analytics }, { visionSection }, noFiles);

    expect(merged.visionSection).toEqual(visionSection);
    expect(merged.heroSection).toEqual(hero);
    expect(merged.analytics).toEqual(analytics);
  });

  it('prefers uploaded files over patch and stored image values', () => {
    const dtoHero = { ...hero, backgroundImages: ['/images/dto.jpg'] };
    const stored: StoredFiles = {
      backgroundImages: ['/images/new.jpg'],
      newsPictureByIndex: {},
    };

    const merged = mergeMainPage(
      { heroSection: hero },
      { heroSection: dtoHero },
      stored,
    );

    expect(merged.heroSection?.backgroundImages).toEqual(['/images/new.jpg']);
    expect(merged.heroSection?.mainHeading).toBe('Old');
  });

  it('keeps stored images when the patch omits them', () => {
    const dtoHero = { mainHeading: 'New', subHeading: 'Sub' };

    const merged = mergeMainPage({ heroSection: hero }, { heroSection: dtoHero }, noFiles);

    expect(merged.heroSection?.backgroundImages).toEqual(['/images/old.jpg']);
    expect(merged.heroSection?.mainHeading).toBe('New');
  });

  it('maps newsPicture.N to card N and falls back to stored card links', () => {
    const existing = {
      newsSection: {
        cards: [
          { tag: 'a', title: 't', content: 'c', date: '2026-09-21', pictureLink: '/images/old0.jpg' },
          { tag: 'b', title: 't', content: 'c', date: '2026-09-21', pictureLink: '/images/old1.jpg' },
        ],
      },
    };
    const dtoCards = [
      { tag: 'a', title: 't2', content: 'c', date: '2026-09-21' },
      { tag: 'b', title: 't', content: 'c', date: '2026-09-21' },
    ];
    const stored: StoredFiles = {
      newsPictureByIndex: { 1: '/images/new1.jpg' },
    };

    const merged = mergeMainPage(
      existing,
      { newsSection: { cards: dtoCards } },
      stored,
    );

    expect(merged.newsSection?.cards[0]?.pictureLink).toBe('/images/old0.jpg');
    expect(merged.newsSection?.cards[1]?.pictureLink).toBe('/images/new1.jpg');
    expect(merged.newsSection?.cards[0]?.title).toBe('t2');
  });

  it('builds content over an empty base', () => {
    const merged = mergeMainPage(undefined, { analytics }, noFiles);

    expect(merged.analytics).toEqual(analytics);
  });
});
