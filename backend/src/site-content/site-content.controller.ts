import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/auth.guard';
import { PERMISSIONS } from 'src/iam/permissions';
import {
  PermissionGuard,
  RequirePermission,
  type AccessRequest,
} from 'src/iam/permission.guard';
import {
  MAX_MEDIA_BYTES,
  MediaService,
  type MediaFile,
} from 'src/media/media.service';
import { SavePageDto } from './dto/save-page.dto';
import { SiteContentService } from './site-content.service';

/** A page key arrives as the wildcard's segments (`colleges/law` -> ['colleges', 'law']). */
const keyOf = (param: string | string[]) =>
  Array.isArray(param) ? param.join('/') : param;

/** GET /site/pages/<key> — what the website reads. Public. */
@Controller('site')
export class SitePublicController {
  constructor(
    @Inject(SiteContentService) private readonly service: SiteContentService,
  ) {}

  @Get('pages/*key')
  @Header('Cache-Control', 'public, max-age=60')
  async page(@Param('key') key: string | string[]) {
    return await this.service.publicPage(keyOf(key));
  }
}

/** /cms/... — the content manager's dashboard. Holders of domain.cms only. */
@Controller('cms')
@UseGuards(AuthGuard, PermissionGuard)
@RequirePermission(PERMISSIONS.cms)
export class SiteCmsController {
  constructor(
    @Inject(SiteContentService) private readonly service: SiteContentService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  /** GET /cms/pages — every page, with when it was last saved. */
  @Get('pages')
  async pages() {
    return await this.service.listPages();
  }

  /** GET /cms/pages/<key> — one page's schema and content, for the editor. */
  @Get('pages/*key')
  async page(@Param('key') key: string | string[]) {
    return await this.service.editablePage(keyOf(key));
  }

  /** PUT /cms/pages/<key> — saves the whole page as its next version. */
  @Put('pages/*key')
  async save(
    @Param('key') key: string | string[],
    @Body() dto: SavePageDto,
    @Req() req: AccessRequest,
  ) {
    return await this.service.savePage(
      keyOf(key),
      dto.content,
      dto.version,
      req.access.userId,
    );
  }

  /** GET /cms/revisions/<key> — the page's saved versions, newest first. */
  @Get('revisions/*key')
  async revisions(@Param('key') key: string | string[]) {
    return await this.service.revisions(keyOf(key));
  }

  /** GET /cms/revision/:id — one saved version's content. */
  @Get('revision/:id')
  async revision(@Param('id', ParseUUIDPipe) id: string) {
    return await this.service.revision(id);
  }

  /**
   * POST /cms/media — stores one image or PDF (field `file`) and returns its
   * URL, which the editor then places in an image or file field.
   */
  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_MEDIA_BYTES } }),
  )
  async upload(@UploadedFile() file?: MediaFile) {
    if (!file) throw new BadRequestException({ code: 'MA' });
    const url =
      file.mimetype === 'application/pdf'
        ? await this.media.storePdf(file.buffer, file.mimetype)
        : await this.media.storeImage(file.buffer, file.mimetype);
    return { url };
  }
}
