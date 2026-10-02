import { IsDefined, IsInt, IsObject, Min } from 'class-validator';

/** Body for saving a page: the whole content, and the version it was edited from. */
export class SavePageDto {
  /** Checked against the page's schema by the service, not here. */
  @IsDefined()
  @IsObject()
  content!: Record<string, unknown>;

  /** The version the editor loaded; 0 for a page that has none yet. */
  @IsInt()
  @Min(0)
  version!: number;
}
