import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { sitePageRevisions, sitePages } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { findPage, PAGES, schemaOf, type SitePage } from './pages';
import { normalizeMapLinks } from './schema/map-links';
import { validateContent } from './schema/validate';

/** What the website reads for one page. */
export interface PublicPage {
  key: string;
  content: unknown;
  version: number;
  updatedAt: Date;
}

/** A page as the content manager's list shows it. */
export interface PageSummary extends SitePage {
  /** 0 until the page has content in the database. */
  version: number;
  updatedAt: Date | null;
  updatedBy: string | null;
}

/** Website content: public reads, and schema-checked saves with history. */
@Injectable()
export class SiteContentService {
  private readonly logger = new Logger(SiteContentService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  private pageOrThrow(key: string): SitePage {
    const page = findPage(key);
    if (!page) throw new NotFoundException({ code: 'UNKNOWN_PAGE' });
    return page;
  }

  /** A page's published content; 404 for an unknown page or one not seeded yet. */
  async publicPage(key: string): Promise<PublicPage> {
    this.pageOrThrow(key);
    const row = await this.db.query.sitePages.findFirst({
      where: eq(sitePages.key, key),
    });
    if (!row) throw new NotFoundException({ code: 'NO_CONTENT' });
    return {
      key: row.key,
      content: row.content,
      version: row.version,
      updatedAt: row.updatedAt,
    };
  }

  /** Every registered page with when and by whom it was last saved. */
  async listPages(): Promise<PageSummary[]> {
    const rows = await this.db.query.sitePages.findMany({
      columns: { key: true, version: true, updatedAt: true },
      with: { editor: { columns: { name: true } } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return PAGES.map((p) => {
      const row = byKey.get(p.key);
      return {
        ...p,
        version: row?.version ?? 0,
        updatedAt: row?.updatedAt ?? null,
        updatedBy: row?.editor?.name ?? null,
      };
    });
  }

  /** One page for the editor: its registry entry, schema and current content. */
  async editablePage(key: string) {
    const page = this.pageOrThrow(key);
    const row = await this.db.query.sitePages.findFirst({
      where: eq(sitePages.key, key),
      with: { editor: { columns: { name: true } } },
    });
    return {
      ...page,
      schema: schemaOf(page),
      content: row?.content ?? null,
      version: row?.version ?? 0,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.editor?.name ?? null,
    };
  }

  /**
   * Saves a page's whole content as its next version. Refused with
   * INVALID_CONTENT (and the issues) when it departs from the page's
   * structure, and with STALE_VERSION when someone saved since the editor
   * loaded it, so no one overwrites another's work unseen. Map links are
   * turned into embed links first; the content as saved is returned.
   */
  async savePage(
    key: string,
    content: unknown,
    version: number,
    userId: string,
  ) {
    const page = this.pageOrThrow(key);

    content = await normalizeMapLinks(schemaOf(page), content);
    const issues = validateContent(schemaOf(page), content);
    if (issues.length)
      throw new BadRequestException({ code: 'INVALID_CONTENT', issues });

    return await this.db.transaction(async (tx) => {
      const row = await tx.query.sitePages.findFirst({
        where: eq(sitePages.key, key),
      });
      const current = row?.version ?? 0;
      if (version !== current) {
        throw new ConflictException({
          code: 'STALE_VERSION',
          version: current,
        });
      }

      const next = current + 1;
      let pageId: string;
      if (row) {
        // the version in the WHERE makes a concurrent save of the same version lose
        const updated = await tx
          .update(sitePages)
          .set({ content, version: next, updatedBy: userId })
          .where(and(eq(sitePages.id, row.id), eq(sitePages.version, current)))
          .returning({ id: sitePages.id });
        if (!updated.length)
          throw new ConflictException({
            code: 'STALE_VERSION',
            version: current,
          });
        pageId = row.id;
      } else {
        const [created] = await tx
          .insert(sitePages)
          .values({
            key,
            template: page.template,
            content,
            version: next,
            updatedBy: userId,
          })
          .onConflictDoNothing({ target: sitePages.key })
          .returning({ id: sitePages.id });
        if (!created)
          throw new ConflictException({
            code: 'STALE_VERSION',
            version: current,
          });
        pageId = created.id;
      }

      await tx
        .insert(sitePageRevisions)
        .values({ pageId, version: next, content, createdBy: userId });
      this.logger.log(`Page ${key} saved as version ${next} by user ${userId}`);
      return { key, version: next, content };
    });
  }

  /** A page's saved versions, newest first, without their content. */
  async revisions(key: string) {
    this.pageOrThrow(key);
    const row = await this.db.query.sitePages.findFirst({
      where: eq(sitePages.key, key),
      columns: { id: true },
    });
    if (!row) return [];
    const rows = await this.db.query.sitePageRevisions.findMany({
      where: eq(sitePageRevisions.pageId, row.id),
      columns: { id: true, version: true, createdAt: true },
      with: { author: { columns: { name: true } } },
      orderBy: desc(sitePageRevisions.version),
    });
    return rows.map((r) => ({
      id: r.id,
      version: r.version,
      createdAt: r.createdAt,
      createdBy: r.author?.name ?? null,
    }));
  }

  /** One saved version's content, to compare with or restore over the current one. */
  async revision(id: string) {
    const row = await this.db.query.sitePageRevisions.findFirst({
      where: eq(sitePageRevisions.id, id),
      with: { page: { columns: { key: true } } },
    });
    if (!row) throw new NotFoundException();
    return {
      id: row.id,
      key: row.page.key,
      version: row.version,
      content: row.content,
      createdAt: row.createdAt,
    };
  }
}
