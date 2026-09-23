import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, inArray, SQL } from 'drizzle-orm';
import { facultyCurriculums, gpas, grades, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import { assertFaculty, assertFacultyExists, scopeFacultyId } from 'src/gr-scope/gr-scope';
import { academicYearToNumber, SEMESTERS } from 'src/common/academic-year';
import { MISSING_NAME } from 'src/common/dto/localized-name.dto';
import { GradesService } from 'src/grades/grades.service';
import { assertNotFrozen, type StudentStanding } from 'src/common/student-standing';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  UpdateStudentDto,
  type AcceptanceType,
  type Nationality,
  type StudentStatus,
  type BulkStudentRowDto,
  type BulkStudentsDto,
} from './dto/students.dto';

/** What one row of a bulk import comes back as, so the preview can mark it. */
export interface BulkRowReport {
  rowNumber: number;
  uniNumber: string;
  /** i18n keys, so the views translate them; empty when the row is ready. */
  problems: string[];
}

/** The dry run's verdict on a whole file. */
export interface BulkCheckReport {
  rows: BulkRowReport[];
  ready: number;
  blocked: number;
}

/** A student as the views consume it. */
export interface StudentView {
  id: string;
  name: { en: string; ar: string };
  uniNumber: string;
  nationalId: string | null;
  nationality: Nationality;
  passportNumber: string | null;
  acceptanceYear: string;
  acceptanceType: AcceptanceType;
  level: number;
  facultyId: string;
  status: StudentStatus | null;
  /** Suspended or dismissed students' grades and results are frozen. */
  standing: StudentStanding;
  /** Suspended students only: the academic years they sit out. */
  suspensionYears: number | null;
}

/** One student, with the disciplinary record the profile shows. */
export interface StudentDetailView extends StudentView {
  /** How many decided cheating cases placed a warning on the student. */
  warnings: number;
}

type StudentRow = typeof students.$inferSelect;

/** CRUD for students with faculty scoping. */
@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject() private readonly gradesService: GradesService,
  ) {}

  /**
   * Resolves the identity document for a nationality: the matching number is
   * kept (checked for uniqueness when it changes), the other one is cleared.
   * Sending the document that doesn't match the nationality is a bad request.
   */
  private async identityDocuments(
    nationality: Nationality,
    nationalIdInput: string | undefined,
    passportInput: string | undefined,
    current: { id?: string; nationalId: string | null; passportNumber: string | null },
  ): Promise<{ nationalId: string | null; passportNumber: string | null }> {
    const sudanese = nationality === 'sudanese';
    if (sudanese ? passportInput?.trim() : nationalIdInput?.trim()) {
      throw new BadRequestException();
    }

    // an omitted field keeps what is stored; a blank one clears it
    const resolve = (input: string | undefined, stored: string | null) =>
      input !== undefined ? input.trim() || null : stored;
    const nationalId = sudanese ? resolve(nationalIdInput, current.nationalId) : null;
    const passportNumber = sudanese ? null : resolve(passportInput, current.passportNumber);

    if (nationalId && nationalId !== current.nationalId) {
      const clash = await this.db.query.students.findFirst({
        where: eq(students.nationalId, nationalId),
      });
      if (clash && clash.id !== current.id) throw new ConflictException();
    }
    if (passportNumber && passportNumber !== current.passportNumber) {
      const clash = await this.db.query.students.findFirst({
        where: eq(students.passportNumber, passportNumber),
      });
      if (clash && clash.id !== current.id) throw new ConflictException();
    }

    return { nationalId, passportNumber };
  }

  /** Maps a row to the shape the views bind to. */
  private toView(row: StudentRow): StudentView {
    return {
      id: row.id,
      name: { en: row.nameEn, ar: row.nameAr },
      uniNumber: row.uniNumber,
      nationalId: row.nationalId,
      nationality: row.nationality,
      passportNumber: row.passportNumber,
      acceptanceYear: row.acceptanceYear,
      acceptanceType: row.acceptanceType as AcceptanceType,
      level: academicYearToNumber(row.academicYear),
      facultyId: row.facultyId,
      status: row.status,
      standing: row.standing,
      suspensionYears: row.suspensionYears,
    };
  }

  /**
   * Lists students, narrowed by the caller's faculty scope and the optional
   * filters the list view and the grade-entry cascade both send.
   */
  async listStudents(
    caller: GrCaller,
    query: ListStudentsQueryDto = {},
  ): Promise<StudentView[]> {
    try {
      const scope = scopeFacultyId(caller);
      // data-entry may only ever see their own faculty, whatever they asked for
      const facultyId = scope ?? query.facultyId;
      if (scope && query.facultyId && query.facultyId !== scope) {
        throw new UnauthorizedException();
      }

      const filters: SQL[] = [];
      if (facultyId) filters.push(eq(students.facultyId, facultyId));
      if (query.level) filters.push(eq(students.academicYear, query.level));
      if (query.acceptanceYear) {
        filters.push(eq(students.acceptanceYear, query.acceptanceYear));
      }
      if (query.standing) filters.push(eq(students.standing, query.standing));

      const rows = await this.db.query.students.findMany({
        where: filters.length ? and(...filters) : undefined,
      });

      let views = rows.map((row) => this.toView(row));
      if (query.q?.trim()) {
        const needle = query.q.trim().toLowerCase();
        views = views.filter(
          (v) =>
            v.name.en.toLowerCase().includes(needle) ||
            v.name.ar.includes(needle) ||
            v.uniNumber.toLowerCase().includes(needle) ||
            (v.nationalId?.includes(needle) ?? false) ||
            (v.passportNumber?.toLowerCase().includes(needle) ?? false),
        );
      }

      return views;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to list students', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** The student with this id, for the details page. */
  async getStudent(id: string, caller: GrCaller): Promise<StudentDetailView> {
    try {
      const row = await this.db.query.students.findFirst({ where: eq(students.id, id) });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.facultyId);

      const warned = await this.db.query.grades.findMany({
        where: and(eq(grades.studentId, row.id), eq(grades.penaltyWarning, true)),
        columns: { id: true },
      });
      return { ...this.toView(row), warnings: warned.length };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to get student: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Creates a student in the given faculty. */
  async createStudent(dto: CreateStudentDto, caller: GrCaller): Promise<StudentView> {
    try {
      const facultyId = await assertFacultyExists(this.db, dto.facultyId);
      assertFaculty(caller, facultyId);

      const uniNumber = dto.uniNumber.trim();
      const existing = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, uniNumber),
      });
      if (existing) throw new ConflictException();

      const documents = await this.identityDocuments(
        dto.nationality,
        dto.nationalId,
        dto.passportNumber,
        { nationalId: null, passportNumber: null },
      );

      const [created] = await this.db
        .insert(students)
        .values({
          // an omitted English name is recorded as a dash, not as a copy of the Arabic
          nameEn: dto.name.en?.trim() || MISSING_NAME,
          nameAr: dto.name.ar.trim(),
          uniNumber,
          nationality: dto.nationality,
          ...documents,
          acceptanceType: dto.acceptanceType,
          acceptanceYear: dto.acceptanceYear.trim(),
          academicYear: dto.level,
          facultyId,
        })
        .returning();

      this.logger.log(`Created student: ${uniNumber}`);
      return this.toView(created);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Failed to create student', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Updates a student; every field may change. Moving faculty leaves the grades
   * in curriculums the new faculty doesn't offer as history, and the caller must
   * first confirm that (GRADES_ORPHANED carries how many are affected).
   */
  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    caller: GrCaller,
  ): Promise<StudentView> {
    const { confirmOrphanedGrades, ...changes } = dto ?? {};
    if (!Object.keys(changes).length) throw new BadRequestException();
    try {
      const row = await this.db.query.students.findFirst({
        where: eq(students.id, id),
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.facultyId);
      // a dismissed student's record is read-only; a suspended one can still be corrected
      if (row.standing === 'dismissed') assertNotFrozen(row.standing);

      const uniNumber = changes.uniNumber?.trim();
      if (uniNumber !== undefined && uniNumber !== row.uniNumber) {
        const clash = await this.db.query.students.findFirst({
          where: eq(students.uniNumber, uniNumber),
        });
        if (clash) throw new ConflictException();
      }

      let facultyId = row.facultyId;
      if (changes.facultyId !== undefined) {
        facultyId = await assertFacultyExists(this.db, changes.facultyId);
        assertFaculty(caller, facultyId);
      }

      if (facultyId !== row.facultyId && !confirmOrphanedGrades) {
        const offered = (
          await this.db.query.facultyCurriculums.findMany({
            where: eq(facultyCurriculums.facultyId, facultyId),
            columns: { curriculumId: true },
          })
        ).map((l) => l.curriculumId);
        const held = await this.db.query.grades.findMany({
          where: eq(grades.studentId, row.id),
          columns: { curriculumId: true },
        });
        const orphaned = held.filter((g) => !offered.includes(g.curriculumId)).length;
        if (orphaned) throw new ConflictException({ code: 'GRADES_ORPHANED', count: orphaned });
      }

      // changing nationality clears the document that no longer applies
      const nationality = changes.nationality ?? row.nationality;
      const documents = await this.identityDocuments(
        nationality,
        changes.nationalId,
        changes.passportNumber,
        row,
      );

      const [updated] = await this.db
        .update(students)
        .set({
          ...(changes.name !== undefined
            ? {
                nameEn: changes.name.en?.trim() || MISSING_NAME,
                nameAr: changes.name.ar.trim(),
              }
            : {}),
          ...(uniNumber !== undefined ? { uniNumber } : {}),
          nationality,
          ...documents,
          ...(changes.acceptanceType !== undefined
            ? { acceptanceType: changes.acceptanceType }
            : {}),
          ...(changes.acceptanceYear !== undefined
            ? { acceptanceYear: changes.acceptanceYear.trim() }
            : {}),
          ...(changes.level !== undefined ? { academicYear: changes.level } : {}),
          facultyId,
        })
        .where(eq(students.id, row.id))
        .returning();

      // the current year is measured against the faculty's curriculums, so it is
      // rebuilt; earlier years keep the GPAs they were given, as history
      if (facultyId !== row.facultyId || updated.academicYear !== row.academicYear) {
        for (const semester of SEMESTERS) {
          await this.gradesService.refreshStudentsSemester(
            [updated.id],
            updated.academicYear,
            semester,
          );
        }
      }

      this.logger.log(`Updated student: ${updated.uniNumber}`);
      return this.toView(updated);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update student: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Reads one bulk import without writing anything: every row is checked for a
   * university number or national ID already taken, in the database or by an
   * earlier row of the same file.
   */
  async checkBulk(dto: BulkStudentsDto, caller: GrCaller): Promise<BulkCheckReport> {
    try {
      const rows = await this.reportBulk(dto.rows, caller);
      const blocked = rows.filter((row) => row.problems.length).length;
      return { rows, ready: rows.length - blocked, blocked };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Failed to check a bulk import', error);
      throw new InternalServerErrorException('Students operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Imports the rows that pass the same checks, skipping the rest. The report
   * says which rows were left behind and why.
   */
  async importBulk(
    dto: BulkStudentsDto,
    caller: GrCaller,
  ): Promise<{ imported: number; skipped: BulkRowReport[] }> {
    try {
      const reports = await this.reportBulk(dto.rows, caller);
      const blocked = new Set(
        reports.filter((row) => row.problems.length).map((row) => row.rowNumber),
      );
      const ready = dto.rows.filter((row) => !blocked.has(row.rowNumber));

      if (ready.length) {
        await this.db.insert(students).values(
          ready.map((row) => ({
            // an omitted English name is recorded as a dash, filled in later elsewhere
            nameEn: row.name.en?.trim() || MISSING_NAME,
            nameAr: row.name.ar.trim(),
            uniNumber: row.uniNumber.trim(),
            nationality: row.nationality,
            nationalId: row.nationality === 'sudanese' ? row.nationalId?.trim() || null : null,
            passportNumber:
              row.nationality === 'foreign' ? row.passportNumber?.trim() || null : null,
            acceptanceType: row.acceptanceType,
            acceptanceYear: row.acceptanceYear.trim(),
            academicYear: row.level,
            facultyId: row.facultyId,
          })),
        );
      }

      this.logger.log(`Bulk imported ${ready.length} students, skipped ${blocked.size}`);
      return {
        imported: ready.length,
        skipped: reports.filter((row) => row.problems.length),
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Failed to run a bulk import', error);
      throw new InternalServerErrorException('Students operation failed', {
        cause: error,
      });
    }
  }

  /**
   * The checks both bulk endpoints share. The taken numbers are read in two
   * queries for the whole file rather than per row, so a large sheet stays cheap.
   */
  private async reportBulk(
    rows: BulkStudentRowDto[],
    caller: GrCaller,
  ): Promise<BulkRowReport[]> {
    const scope = scopeFacultyId(caller);

    const uniNumbers = rows.map((row) => row.uniNumber.trim()).filter(Boolean);
    const nationalIds = rows
      .map((row) => row.nationalId?.trim())
      .filter((value): value is string => !!value);

    const takenUni = new Set(
      (
        await this.db.query.students.findMany({
          where: inArray(students.uniNumber, uniNumbers.length ? uniNumbers : ['']),
          columns: { uniNumber: true },
        })
      ).map((row) => row.uniNumber),
    );
    const takenNationalId = new Set(
      (
        await this.db.query.students.findMany({
          where: inArray(students.nationalId, nationalIds.length ? nationalIds : ['']),
          columns: { nationalId: true },
        })
      )
        .map((row) => row.nationalId)
        .filter((value): value is string => !!value),
    );

    const seenUni = new Set<string>();
    const seenNationalId = new Set<string>();

    return rows.map((row) => {
      const uniNumber = row.uniNumber.trim();
      const nationalId = row.nationalId?.trim();
      const problems: string[] = [];

      if (scope && row.facultyId !== scope) problems.push('bulkImport.problems.faculty');

      if (takenUni.has(uniNumber)) problems.push('bulkImport.problems.uniNumberTaken');
      else if (seenUni.has(uniNumber)) problems.push('bulkImport.problems.uniNumberRepeated');
      seenUni.add(uniNumber);

      if (nationalId) {
        if (takenNationalId.has(nationalId)) {
          problems.push('bulkImport.problems.nationalIdTaken');
        } else if (seenNationalId.has(nationalId)) {
          problems.push('bulkImport.problems.nationalIdRepeated');
        }
        seenNationalId.add(nationalId);
      }

      return { rowNumber: row.rowNumber, uniNumber, problems };
    });
  }

  /** Deletes the student with this id, plus their grades and GPAs. */
  async deleteStudent(id: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const row = await this.db.query.students.findFirst({
        where: eq(students.id, id),
        columns: { id: true, facultyId: true, uniNumber: true, standing: true },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.facultyId);
      // a frozen record is kept; an admin reinstates the student first
      assertNotFrozen(row.standing);

      await this.db.transaction(async (tx) => {
        await tx.delete(grades).where(eq(grades.studentId, row.id));
        await tx.delete(gpas).where(eq(gpas.studentId, row.id));
        await tx.delete(students).where(eq(students.id, row.id));
      });

      this.logger.log(`Deleted student: ${row.uniNumber}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete student: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Lifts a suspension or reverses a dismissal. Admin only. The penalties stay
   * on the cheating cases as a record, and the current year's GPA, frozen until
   * now, is rebuilt.
   */
  async reinstateStudent(id: string, caller: GrCaller): Promise<StudentView> {
    if (caller.role !== 'admin') throw new UnauthorizedException();
    try {
      const row = await this.db.query.students.findFirst({ where: eq(students.id, id) });
      if (!row) throw new NotFoundException();
      if (row.standing === 'active') throw new ConflictException({ code: 'NOT_FROZEN' });

      const [updated] = await this.db
        .update(students)
        .set({ standing: 'active', suspensionYears: null })
        .where(eq(students.id, row.id))
        .returning();

      for (const semester of SEMESTERS) {
        await this.gradesService.refreshStudentsSemester([updated.id], updated.academicYear, semester);
      }

      this.logger.log(`Reinstated student ${updated.uniNumber} (was ${row.standing})`);
      return this.toView(updated);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to reinstate student: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }
}
