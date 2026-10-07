import { f } from './fields';
import { coordinatesIn, normalizeMapLinks, toMapEmbed } from './map-links';
import { validateContent } from './validate';

const PLACE =
  'https://www.google.com/maps/place/%D8%A7%D9%84%D8%AC%D8%A7%D9%85%D8%B9%D8%A9/@15.5475732,32.5446659,17z/data=!3m1!4b1!4m6!3m5!1s0x168e91cbd2cfa435:0x8f92038a497fa25a!8m2!3d15.547568!4d32.5472408!16s%2Fg%2F11fd4yggmg';
const PINNED =
  'https://maps.google.com/maps?q=15.547568,32.5472408&z=16&output=embed';

describe('map links', () => {
  afterEach(() => jest.restoreAllMocks());

  it("reads the place's own pin before the view's centre", () => {
    expect(coordinatesIn(PLACE)).toEqual(['15.547568', '32.5472408']);
    expect(coordinatesIn('https://www.google.com/maps/@15.5,32.5,15z')).toEqual(
      ['15.5', '32.5'],
    );
    expect(coordinatesIn('https://www.google.com/maps?q=15.5,32.5')).toEqual([
      '15.5',
      '32.5',
    ]);
    expect(coordinatesIn('https://www.google.com/maps?q=Khartoum')).toBeNull();
  });

  it('turns a place link into an embed link with the pin', async () => {
    expect(await toMapEmbed(PLACE)).toBe(PINNED);
  });

  it('follows a short share link to its place', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: PLACE } }),
      );
    expect(await toMapEmbed('https://maps.app.goo.gl/zor2Qe8W1XBXdCqN6')).toBe(
      PINNED,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves embed links and unreadable links as they are', async () => {
    const embed = 'https://www.google.com/maps/embed?pb=!1m18!1m12';
    expect(await toMapEmbed(embed)).toBe(embed);
    expect(await toMapEmbed(PINNED)).toBe(PINNED);
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await toMapEmbed('https://maps.app.goo.gl/broken')).toBe(
      'https://maps.app.goo.gl/broken',
    );
  });

  it('converts map fields anywhere in the content, and refuses what it cannot', async () => {
    const schema = f.group(['ص', 'Page'], {
      map: f.group(['خريطة', 'Map'], {
        link: f.string(['رابط', 'Link'], { format: 'map' }),
      }),
    });
    const saved = await normalizeMapLinks(schema, { map: { link: PLACE } });
    expect(saved).toEqual({ map: { link: PINNED } });
    expect(validateContent(schema, saved)).toEqual([]);

    const unreadable = await normalizeMapLinks(schema, {
      map: { link: 'https://www.google.com/maps?q=Khartoum' },
    });
    expect(validateContent(schema, unreadable)).toEqual([
      { path: 'map.link', code: 'BAD_MAP_LINK' },
    ]);
  });
});
