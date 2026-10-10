import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { applications, medicalForms, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import type { ApplicationUpdateDto, BulkApplicationsDto } from './dto/create-application.dto';
import type { MedicalFormDto } from './dto/medical-form.dto';
import { MediaFile, MediaService } from 'src/media/media.service';

/** What one row of a bulk import comes back as, so the preview can mark it. */
export interface ApplicationRowReport {
  rowNumber: number;
  formNumber: string;
  /** i18n keys, so the views translate them; empty when the row is ready. */
  problems: string[];
}

/** Multer keys files by the FileFieldsInterceptor field names; every value is an array. */
export interface ApplicationCompletionFiles {
  nationalIdFile: MediaFile[];
  studentPhoto: MediaFile[];
  highSchoolCertificate: MediaFile[];
  finantialAidDocuments?: MediaFile[];
}

/** The dry run's verdict on a whole file. */
export interface ApplicationCheckReport {
  rows: ApplicationRowReport[];
  ready: number;
  blocked: number;
}

/**
 * Arabic text differs between sheets by article, spelling and spacing, so it
 * is compared loosely — mirrors normalise() in frontend bulkStudents.ts.
 */
function normalise(value: string): string {
  return value
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word !== 'كليه')
    .map((word) => word.replace(/^ال/, ''))
    .join(' ');
}

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    @Inject() private readonly mediaService: MediaService,
    @Inject(DATABASE) private readonly db: Db,
  ) {}

  /** Every staged application. */
  async listApplications() {
    try {
      const rows = await this.db.query.applications.findMany();
      this.logger.log(`Listed ${rows.length} applications`);
      return rows;
    } catch (error) {
      this.logger.error('Failed to list applications', error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  async processFiles(files: ApplicationCompletionFiles) {
    try {
      const finantialAidDocsHahses: string[] = [];
      this.logger.debug(
        `Storing files: photo ${files.studentPhoto?.length ?? 0}, nationalId ${files.nationalIdFile?.length ?? 0}, certificate ${files.highSchoolCertificate?.length ?? 0}, aidDocs ${files.finantialAidDocuments?.length ?? 0}`,
      );

      const [photo, nationalId, certificate] = [
        files.studentPhoto?.[0],
        files.nationalIdFile?.[0],
        files.highSchoolCertificate?.[0],
      ];
      if (!photo || !nationalId || !certificate) throw new BadRequestException({ code: 'MA' });

      const storingPhoto = await this.mediaService.storeImage(photo.buffer, photo.mimetype);

      const sotringNationalId = await this.mediaService.storePdf(
        nationalId.buffer,
        nationalId.mimetype,
      );

      const highSchoolCertificate = await this.mediaService.storePdf(
        certificate.buffer,
        certificate.mimetype,
      );
      for (const doc of files.finantialAidDocuments ?? []) {
        const docHash = await this.mediaService.storePdf(doc.buffer, doc.mimetype);
        finantialAidDocsHahses.push(docHash);
      }

      this.logger.log(
        `Stored files: photo ${storingPhoto}, nationalId ${sotringNationalId}, certificate ${highSchoolCertificate}, aidDocs ${finantialAidDocsHahses.length}`,
      );

      return { storingPhoto, sotringNationalId, highSchoolCertificate, finantialAidDocsHahses };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to store application files', error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  async completeApplication(
    formNumber: string,
    files: ApplicationCompletionFiles,
    dto: ApplicationUpdateDto,
  ) {
    try {
      this.logger.log(`Completing application ${formNumber}`);
      const key = formNumber.trim();
      const exists = await this.db.query.applications.findFirst({
        where: eq(applications.formNumber, key),
      });
      if (!exists) {
        this.logger.warn(`Completing ${formNumber}: not found`);
        throw new NotFoundException({ code: 'NF' });
      }
      const hashes = await this.processFiles(files);

      const updated = await this.db
        .update(applications)
        .set({
          nameEn: dto.nameEn,
          state: dto.state,
          residencyType: dto.residencyType,
          finantialAidNote: dto.finantialAidNote,
          finantialAidDocuments: hashes.finantialAidDocsHahses,
          studentPhoto: hashes.storingPhoto,
          highSchoolCertificate: hashes.highSchoolCertificate,
          nationalIdFile: hashes.sotringNationalId,
          status: true,
        })
        .where(eq(applications.formNumber, key))
        .returning();

      this.logger.log(`Completed application ${formNumber}: ${updated.length} row(s) updated`);

      return { stats: 'ok' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to complete application ${formNumber}`, error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  /** Saves the medical fitness form for one application; a re-post overwrites it. */
  async saveMedicalForm(formNumber: string, dto: MedicalFormDto, signature?: MediaFile) {
    try {
      if (!signature) {
        this.logger.warn(`Saving medical form for ${formNumber}: signature missing`);
        throw new BadRequestException({ code: 'MA' });
      }

      const application = await this.db.query.applications.findFirst({
        where: eq(applications.formNumber, formNumber.trim()),
      });
      if (!application) {
        this.logger.warn(`Saving medical form for ${formNumber}: application not found`);
        throw new NotFoundException({ code: 'NF' });
      }

      if (!application.status) {
        this.logger.warn('attempt to create a medical form for an incomplete application');
        throw new BadRequestException();
      }
      // mandatory upload: storeImage throws PI on non-image content
      const doctorSignature = await this.mediaService.storeImage(
        signature.buffer,
        signature.mimetype,
      );

      const [row] = await this.db
        .insert(medicalForms)
        .values({ applicationId: application.id, ...dto, doctorSignature })
        .onConflictDoUpdate({
          target: medicalForms.applicationId,
          set: { ...dto, doctorSignature, status: true },
        })
        .returning();
      this.logger.log(`Saved medical form for ${formNumber}: signature stored`);
      return row;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to save medical form for ${formNumber}`, error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  /** Every medical fitness form. */
  async listMedicalForms() {
    try {
      const rows = await this.db.query.medicalForms.findMany();
      this.logger.log(`Listed ${rows.length} medical forms`);
      return rows;
    } catch (error) {
      this.logger.error('Failed to list medical forms', error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  /** Medical fitness form for one application. */
  async getMedicalForm(formNumber: string) {
    try {
      const application = await this.db.query.applications.findFirst({
        where: eq(applications.formNumber, formNumber.trim()),
      });
      if (!application) throw new NotFoundException({ code: 'NF' });
      const row = await this.db.query.medicalForms.findFirst({
        where: eq(medicalForms.applicationId, application.id),
      });
      if (!row) {
        this.logger.warn(`Getting medical form for ${formNumber}: not submitted yet`);
        throw new NotFoundException({ code: 'NF' });
      }
      this.logger.log(`Got medical form for ${formNumber}`);
      return row;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get medical form for ${formNumber}`, error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  /** One application by its form number. */
  async getByFormNumber(formNumber: string) {
    try {
      const row = await this.db.query.applications.findFirst({
        where: eq(applications.formNumber, formNumber.trim()),
      });
      if (!row) throw new NotFoundException();
      return row;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get application: ${formNumber}`, error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  /** Dry run; writes nothing. */
  async checkBulk(dto: BulkApplicationsDto): Promise<ApplicationCheckReport> {
    try {
      const rows = await this.reportBulk(dto);
      const blocked = rows.filter((row) => row.problems.length).length;
      this.logger.log(
        `Bulk check: ${rows.length - blocked} ready, ${blocked} blocked (${dto.rows.length} rows)`,
      );
      return { rows, ready: rows.length - blocked, blocked };
    } catch (error) {
      this.logger.error('Failed to check a bulk import', error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  /** Imports the rows that pass the same checks, skipping the rest. */
  async importBulk(
    dto: BulkApplicationsDto,
  ): Promise<{ imported: number; skipped: ApplicationRowReport[] }> {
    try {
      const reports = await this.reportBulk(dto);
      const blocked = new Set(
        reports.filter((row) => row.problems.length).map((row) => row.rowNumber),
      );
      const ready = dto.rows.filter((row) => !blocked.has(row.rowNumber));
      if (ready.length) {
        await this.db.insert(applications).values(
          ready.map((row) => ({
            formNumber: row.formNumber.trim(),
            schoolName: row.schoolName.trim(),
            code: row.code.trim(),
            facultyName: row.faculty.trim(),
            departmentName: row.department?.trim() || null,
            specializationName: row.specialization?.trim() || null,
            acceptanceType: row.acceptanceType.trim(),
            nationalId: row.nationalId?.trim() || null,
            notes: row.notes?.trim() || null,
            name: row.name.trim(),
          })),
        );
      }
      this.logger.log(`Bulk imported ${ready.length} applications, skipped ${blocked.size}`);
      return { imported: ready.length, skipped: reports.filter((row) => row.problems.length) };
    } catch (error) {
      this.logger.error('Failed to run a bulk import', error);
      throw new InternalServerErrorException('Applications operation failed', { cause: error });
    }
  }

  /**
   * The checks both bulk endpoints share. Taken numbers are read for the whole
   * file rather than per row, so a large sheet stays cheap.
   */
  private async reportBulk(dto: BulkApplicationsDto): Promise<ApplicationRowReport[]> {
    const rows = dto.rows;
    const text = (value: string | undefined): string => (value ?? '').trim();
    this.logger.debug(`Bulk report: checking ${rows.length} rows`);

    const formNumbers = rows.map((row) => text(row.formNumber)).filter(Boolean);
    const nationalIds = rows.map((row) => text(row.nationalId)).filter(Boolean);

    const takenForm = new Set(
      (
        await this.db.query.applications.findMany({
          where: inArray(applications.formNumber, formNumbers.length ? formNumbers : ['']),
          columns: { formNumber: true },
        })
      ).map((row) => row.formNumber),
    );
    const takenNationalId = new Set<string>([
      ...(
        await this.db.query.students.findMany({
          where: inArray(students.nationalId, nationalIds.length ? nationalIds : ['']),
          columns: { nationalId: true },
        })
      )
        .map((row) => row.nationalId)
        .filter((value): value is string => !!value),
      ...(
        await this.db.query.applications.findMany({
          where: inArray(applications.nationalId, nationalIds.length ? nationalIds : ['']),
          columns: { nationalId: true },
        })
      )
        .map((row) => row.nationalId)
        .filter((value): value is string => !!value),
    ]);
    this.logger.debug(
      `Bulk report: ${takenForm.size} taken form numbers, ${takenNationalId.size} taken national IDs`,
    );

    // what each named faculty, department and specialization resolves to
    const faculties = await this.db.query.faculties.findMany({
      columns: { id: true, nameAr: true },
    });
    const facultyOf = new Map(faculties.map((f) => [normalise(f.nameAr), f]));
    const departments = await this.db.query.facultyDepartments.findMany({
      columns: { id: true, facultyId: true, nameAr: true },
    });
    const deptByName = new Map(departments.map((d) => [normalise(d.nameAr), d]));
    const specializations = await this.db.query.specializations.findMany({
      columns: { id: true, facultyId: true, departmentId: true, nameAr: true },
    });
    const specByName = new Map(specializations.map((s) => [normalise(s.nameAr), s]));
    this.logger.debug(
      `Bulk report: resolving against ${faculties.length} faculties, ${departments.length} departments, ${specializations.length} specializations`,
    );

    const seenForm = new Set<string>();
    const seenNationalId = new Set<string>();

    return rows
      .map((row) => {
        const formNumber = text(row.formNumber);
        const nationalId = text(row.nationalId);
        const problems: string[] = [];

        const faculty = facultyOf.get(normalise(text(row.faculty)));
        this.logger.debug(
          `Bulk row ${row.rowNumber}: faculty '${text(row.faculty)}' -> ${faculty ? `${faculty.nameAr} (${faculty.id})` : 'MISS'}`,
        );
        if (!faculty) {
          problems.push('applicationImport.problems.facultyUnknown');
        } else {
          const deptName = text(row.department);
          const dept = deptName ? deptByName.get(normalise(deptName)) : undefined;
          if (deptName) {
            this.logger.debug(
              `Bulk row ${row.rowNumber}: department '${deptName}' -> ${dept ? `${dept.nameAr} (${dept.id})` : 'MISS'}`,
            );
          }
          if (deptName && !dept) {
            problems.push('applicationImport.problems.departmentUnknown');
          } else if (dept && dept.facultyId !== faculty.id) {
            problems.push('applicationImport.problems.departmentMismatch');
          }
          const specName = text(row.specialization);
          const spec = specName ? specByName.get(normalise(specName)) : undefined;
          if (specName) {
            this.logger.debug(
              `Bulk row ${row.rowNumber}: specialization '${specName}' -> ${spec ? `${spec.nameAr} (${spec.id})` : 'MISS'}`,
            );
          }
          if (specName && !spec) {
            problems.push('applicationImport.problems.specializationUnknown');
            this.logger.debug(
              `Bulk row ${row.rowNumber}: specialization '${specName}' matches nothing`,
            );
          } else if (spec && spec.facultyId !== faculty.id) {
            problems.push('applicationImport.problems.specializationMismatch');
            this.logger.debug(
              `Bulk row ${row.rowNumber}: specialization '${specName}' belongs to another faculty`,
            );
          } else if (spec && dept && spec.departmentId !== dept.id) {
            problems.push('applicationImport.problems.specializationMismatch');
            this.logger.debug(
              `Bulk row ${row.rowNumber}: specialization '${specName}' is not under department '${deptName}'`,
            );
          }
        }

        if (takenForm.has(formNumber)) {
          problems.push('applicationImport.problems.formNumberTaken');
          this.logger.debug(
            `Bulk row ${row.rowNumber}: formNumber '${formNumber}' already imported`,
          );
        } else if (seenForm.has(formNumber)) {
          problems.push('applicationImport.problems.formNumberRepeated');
          this.logger.debug(
            `Bulk row ${row.rowNumber}: formNumber '${formNumber}' repeated in file`,
          );
        }
        seenForm.add(formNumber);

        if (nationalId) {
          if (takenNationalId.has(nationalId)) {
            problems.push('applicationImport.problems.nationalIdTaken');
            this.logger.debug(
              `Bulk row ${row.rowNumber}: nationalId '${nationalId}' already taken`,
            );
          } else if (seenNationalId.has(nationalId)) {
            problems.push('applicationImport.problems.nationalIdRepeated');
            this.logger.debug(
              `Bulk row ${row.rowNumber}: nationalId '${nationalId}' repeated in file`,
            );
          }
          seenNationalId.add(nationalId);
        }

        return { rowNumber: row.rowNumber, formNumber, problems };
      })
      .map((report) => {
        if (report.problems.length) {
          this.logger.debug(
            `Bulk row ${report.rowNumber} (${report.formNumber}): ${report.problems.join(', ')}`,
          );
        }
        return report;
      });
  }
}
