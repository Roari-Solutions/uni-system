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
import { and, desc, eq, inArray, type SQL } from 'drizzle-orm';
import {
  faculties,
  facultyCurriculums,
  grades,
  results,
  resultStudents,
  students,
} from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import {
  assertFaculty,
  assertFacultyExists,
  scopeFacultyId,
} from 'src/gr-scope/gr-scope';
import {
  academicYearToNumber,
  semesterToNumber,
  type AcademicYear,
  type Semester,
} from 'src/common/academic-year';
import { letterOf, type LetterGrade } from 'src/grades/letter-grade';
import { resitKindOf, type ResitView } from 'src/grades/grades.service';
import { backfillSerialNos } from 'src/curriculums/serial-no';
import {
  GenerateResultDto,
  ListResultsQueryDto,
  type ResultKind,
} from './dto/results.dto';
import {
  canonicalJson,
  totalsOf,
  yearTotalsOf,
  type CellState,
  type ResultCell,
  type ResultCourse,
  type ResultHeader,
  type ResultSheet,
} from './result-sheet';

/** The students one result covers. */
interface Batch {
  facultyId: string;
  academicYear: AcademicYear;
  acceptanceYear: string;
  semester: Semester;
}

type ResultRow = typeof results.$inferSelect;
type GradeRow = typeof grades.$inferSelect;

/** A result in the list: everything but the sheet itself. */
export interface ResultSummaryView {
  id: string;
  facultyId: string;
  academicYear: number;
  acceptanceYear: string;
  semester: number;
  kind: ResultKind;
  status: 'pending' | 'approved';
  header: ResultHeader;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

/** One result with its frozen sheet. */
export interface ResultView extends ResultSummaryView {
  sheet: ResultSheet;
  /** Pending only: the grades have changed since the sheet was generated. */
  stale: boolean;
}

/** A cell that may take a Sup & Sub re-exam, with what it holds now. */
export interface ResitCandidateView {
  gradeId: string;
  studentId: string;
  uniNumber: string;
  name: string;
  curriculumId: string;
  sNo: number;
  code: string | null;
  state: CellState;
  mark: number | null;
  letter: LetterGrade | null;
  kind: ResitView['kind'];
  resit: ResitView | null;
}

/** How one stored grade row prints. No row, or one with no mark, is incomplete. */
function cellOf(
  curriculumId: string,
  row: GradeRow | undefined,
  withResit: boolean,
): ResultCell {
  const resit =
    withResit && row?.resitKind && row.resitGrade !== null && row.resitLetter
      ? {
          kind: row.resitKind,
          mark: Number(row.resitGrade),
          letter: row.resitLetter,
        }
      : null;
  const cell = (
    state: CellState,
    mark: number | null,
    letter: LetterGrade | null,
  ) => ({
    curriculumId,
    state,
    mark,
    letter,
    resit,
  });

  if (row?.seatingStatus === 'substitute')
    return cell('substitute', null, null);
  if (!row || row.grade === null) return cell('incomplete', null, null);

  const mark = Number(row.grade);
  // the stored letter: a mark keeps the scale it was entered under
  const letter = row.letter ?? letterOf(mark);
  switch (row.seatingStatus) {
    case 'absent':
      return cell('absent', mark, letter);
    case 'barred':
      return cell('barred', mark, letter);
    case 'cheating':
      // an open case prints "@" alone and counts for nothing
      return row.cheatingResolved
        ? cell('cheating', mark, letter)
        : cell('cheatingPending', null, null);
    default:
      return cell('marked', mark, letter);
  }
}

const isoOrNull = (value: Date | null) => (value ? value.toISOString() : null);

/**
 * Board results and final results for a batch: a batch is one faculty's
 * students at one level with one acceptance year. Generating freezes the sheet;
 * approving it locks the batch's grades for that semester.
 */
@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** The curriculums a faculty offers in one year and semester, in S.No. order. */
  private async coursesOf(
    facultyId: string,
    academicYear: AcademicYear,
    semester: Semester,
  ): Promise<ResultCourse[]> {
    const links = await this.db.query.facultyCurriculums.findMany({
      where: eq(facultyCurriculums.facultyId, facultyId),
      with: {
        curriculum: {
          columns: {
            id: true,
            nameEn: true,
            abbreviation: true,
            academicYear: true,
            semester: true,
            courseHours: true,
          },
        },
      },
    });
    return links
      .filter(
        (l) =>
          l.curriculum.academicYear === academicYear &&
          l.curriculum.semester === semester,
      )
      .map((l) => ({
        sNo: l.serialNo ?? 0,
        curriculumId: l.curriculum.id,
        code: l.curriculum.abbreviation,
        name: l.curriculum.nameEn,
        hours: l.curriculum.courseHours,
      }))
      .sort(
        (a, b) => a.sNo - b.sNo || (a.code ?? '').localeCompare(b.code ?? ''),
      );
  }

  /**
   * Builds the sheet from the grades as they stand. A regular sheet shows the
   * semester's own marks; a resit sheet shows the Sup & Sub marks over them.
   * A second-semester sheet adds the year's totals, with the first semester
   * counted as it finally stands (its resits included).
   */
  private async buildSheet(
    batch: Batch,
    kind: ResultKind,
  ): Promise<ResultSheet> {
    const faculty = await this.db.query.faculties.findFirst({
      where: eq(faculties.id, batch.facultyId),
      columns: { nameEn: true },
    });
    if (!faculty) throw new BadRequestException();

    // curriculums from before S.No.s existed get theirs before they are printed
    await backfillSerialNos(this.db);
    const courses = await this.coursesOf(
      batch.facultyId,
      batch.academicYear,
      batch.semester,
    );
    const yearSheet = batch.semester === '2';
    const firstCourses = yearSheet
      ? await this.coursesOf(batch.facultyId, batch.academicYear, '1')
      : [];

    const cohort = await this.db.query.students.findMany({
      where: and(
        eq(students.facultyId, batch.facultyId),
        eq(students.academicYear, batch.academicYear),
        eq(students.acceptanceYear, batch.acceptanceYear),
      ),
      columns: { id: true, uniNumber: true, nameEn: true, standing: true },
    });
    if (!courses.length || !cohort.length) {
      throw new BadRequestException({ code: 'EMPTY_BATCH' });
    }

    const curriculumIds = [...courses, ...firstCourses].map(
      (c) => c.curriculumId,
    );
    const rows = await this.db.query.grades.findMany({
      where: and(
        inArray(
          grades.studentId,
          cohort.map((s) => s.id),
        ),
        inArray(grades.curriculumId, curriculumIds),
      ),
    });
    const rowOf = new Map(
      rows.map((r) => [`${r.studentId}:${r.curriculumId}`, r]),
    );
    const withResit = kind === 'resit';

    return {
      college: faculty.nameEn,
      academicYear: academicYearToNumber(batch.academicYear),
      acceptanceYear: batch.acceptanceYear,
      semester: semesterToNumber(batch.semester),
      kind,
      courses,
      students: cohort
        .sort((a, b) => a.uniNumber.localeCompare(b.uniNumber))
        .map((s) => {
          const cells = courses.map((c) =>
            cellOf(
              c.curriculumId,
              rowOf.get(`${s.id}:${c.curriculumId}`),
              withResit,
            ),
          );
          const semester = totalsOf(cells, courses, withResit);
          const firstCells = firstCourses.map((c) =>
            cellOf(
              c.curriculumId,
              rowOf.get(`${s.id}:${c.curriculumId}`),
              true,
            ),
          );
          return {
            id: s.id,
            uniNumber: s.uniNumber,
            name: s.nameEn,
            standing: s.standing,
            cells,
            semester,
            year: yearSheet
              ? yearTotalsOf([
                  totalsOf(firstCells, firstCourses, true),
                  semester,
                ])
              : null,
          };
        }),
    };
  }

  private batchOf(row: ResultRow): Batch {
    return {
      facultyId: row.facultyId,
      academicYear: row.academicYear,
      acceptanceYear: row.acceptanceYear,
      semester: row.semester,
    };
  }

  private summaryOf(row: ResultRow): ResultSummaryView {
    return {
      id: row.id,
      facultyId: row.facultyId,
      academicYear: academicYearToNumber(row.academicYear),
      acceptanceYear: row.acceptanceYear,
      semester: semesterToNumber(row.semester),
      kind: row.kind,
      status: row.status,
      header: row.header,
      studentCount: row.sheet.students.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      approvedAt: isoOrNull(row.approvedAt),
    };
  }

  /** Whether a pending sheet no longer matches the grades. An approved one never goes stale: its grades are locked. */
  private async isStale(row: ResultRow): Promise<boolean> {
    if (row.status !== 'pending') return false;
    try {
      const fresh = await this.buildSheet(this.batchOf(row), row.kind);
      return canonicalJson(fresh) !== canonicalJson(row.sheet);
    } catch (error) {
      // the batch or its curriculums are gone: the sheet no longer holds
      if (error instanceof BadRequestException) return true;
      throw error;
    }
  }

  private async resultOrThrow(
    id: string,
    caller: GrCaller,
  ): Promise<ResultRow> {
    const row = await this.db.query.results.findFirst({
      where: eq(results.id, id),
    });
    if (!row) throw new NotFoundException();
    assertFaculty(caller, row.facultyId);
    return row;
  }

  /** Rethrows the errors the views handle; anything else is logged as a failure. */
  private fail(message: string, error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnauthorizedException
    ) {
      throw error;
    }
    this.logger.error(message, error);
    throw new InternalServerErrorException('Results operation failed', {
      cause: error,
    });
  }

  /** Lists results, narrowed by the caller's faculty scope and the filters. */
  async listResults(
    caller: GrCaller,
    query: ListResultsQueryDto = {},
  ): Promise<ResultSummaryView[]> {
    try {
      const scope = scopeFacultyId(caller);
      if (scope && query.facultyId && query.facultyId !== scope) {
        throw new UnauthorizedException();
      }
      const facultyId = scope ?? query.facultyId;

      const filters: SQL[] = [];
      if (facultyId) filters.push(eq(results.facultyId, facultyId));
      if (query.academicYear)
        filters.push(eq(results.academicYear, query.academicYear));
      if (query.acceptanceYear)
        filters.push(eq(results.acceptanceYear, query.acceptanceYear));
      if (query.semester) filters.push(eq(results.semester, query.semester));
      if (query.status) filters.push(eq(results.status, query.status));

      const rows = await this.db.query.results.findMany({
        where: filters.length ? and(...filters) : undefined,
        orderBy: desc(results.updatedAt),
      });
      return rows.map((row) => this.summaryOf(row));
    } catch (error) {
      this.fail('Failed to list results', error);
    }
  }

  /** One result with its sheet; a pending one says whether the grades moved since. */
  async getResult(id: string, caller: GrCaller): Promise<ResultView> {
    try {
      const row = await this.resultOrThrow(id, caller);
      return {
        ...this.summaryOf(row),
        sheet: row.sheet,
        stale: await this.isStale(row),
      };
    } catch (error) {
      this.fail(`Failed to read result: ${id}`, error);
    }
  }

  /**
   * Generates a batch's board results, or regenerates a pending one from the
   * grades as they now stand. An approved result is final. Sup & Sub results
   * follow only once the regular results are approved.
   */
  async generateResult(
    dto: GenerateResultDto,
    caller: GrCaller,
  ): Promise<ResultView> {
    try {
      const facultyId = await assertFacultyExists(this.db, dto.facultyId);
      assertFaculty(caller, facultyId);
      const batch: Batch = {
        facultyId,
        academicYear: dto.academicYear,
        acceptanceYear: dto.acceptanceYear,
        semester: dto.semester,
      };
      const sameBatch = (kind: ResultKind) =>
        and(
          eq(results.facultyId, batch.facultyId),
          eq(results.academicYear, batch.academicYear),
          eq(results.acceptanceYear, batch.acceptanceYear),
          eq(results.semester, batch.semester),
          eq(results.kind, kind),
        );

      if (dto.kind === 'resit') {
        const regular = await this.db.query.results.findFirst({
          where: sameBatch('regular'),
          columns: { status: true },
        });
        if (regular?.status !== 'approved') {
          throw new ConflictException({ code: 'REGULAR_NOT_APPROVED' });
        }
      }

      const existing = await this.db.query.results.findFirst({
        where: sameBatch(dto.kind),
      });
      if (existing?.status === 'approved') {
        throw new ConflictException({ code: 'ALREADY_APPROVED' });
      }

      const sheet = await this.buildSheet(batch, dto.kind);
      const header: ResultHeader = {
        program: dto.header.program.trim(),
        batch: dto.header.batch.trim(),
        academicYearLabel: dto.header.academicYearLabel.trim(),
        examDate: dto.header.examDate.trim(),
        collegeBoardDate: dto.header.collegeBoardDate.trim(),
        centralBoardDate: dto.header.centralBoardDate.trim(),
      };

      const saved = await this.db.transaction(async (tx) => {
        let row: ResultRow;
        if (existing) {
          [row] = await tx
            .update(results)
            .set({ header, sheet })
            .where(eq(results.id, existing.id))
            .returning();
          await tx
            .delete(resultStudents)
            .where(eq(resultStudents.resultId, existing.id));
        } else {
          [row] = await tx
            .insert(results)
            .values({ ...batch, kind: dto.kind, header, sheet })
            .returning();
        }
        await tx
          .insert(resultStudents)
          .values(
            sheet.students.map((s) => ({ resultId: row.id, studentId: s.id })),
          );
        return row;
      });

      this.logger.log(
        `${existing ? 'Regenerated' : 'Generated'} ${dto.kind} result ${saved.id} ` +
          `(${sheet.students.length} students)`,
      );
      return { ...this.summaryOf(saved), sheet: saved.sheet, stale: false };
    } catch (error) {
      this.fail('Failed to generate result', error);
    }
  }

  /**
   * Approves pending board results once the college board has, which locks the
   * batch's grades for the semester. A sheet the grades have moved away from
   * must be regenerated first (RESULT_STALE), so what is locked is what the
   * board saw.
   */
  async approveResult(id: string, caller: GrCaller): Promise<ResultView> {
    try {
      const row = await this.resultOrThrow(id, caller);
      if (row.status !== 'pending')
        throw new ConflictException({ code: 'ALREADY_APPROVED' });
      if (await this.isStale(row))
        throw new ConflictException({ code: 'RESULT_STALE' });

      const [approved] = await this.db
        .update(results)
        .set({ status: 'approved', approvedAt: new Date() })
        .where(eq(results.id, row.id))
        .returning();

      this.logger.log(`Approved ${row.kind} result: ${row.id}`);
      return {
        ...this.summaryOf(approved),
        sheet: approved.sheet,
        stale: false,
      };
    } catch (error) {
      this.fail(`Failed to approve result: ${id}`, error);
    }
  }

  /** Discards pending board results; approved ones are final. */
  async discardResult(
    id: string,
    caller: GrCaller,
  ): Promise<{ status: string }> {
    try {
      const row = await this.resultOrThrow(id, caller);
      if (row.status !== 'pending')
        throw new ConflictException({ code: 'ALREADY_APPROVED' });

      await this.db.transaction(async (tx) => {
        await tx
          .delete(resultStudents)
          .where(eq(resultStudents.resultId, row.id));
        await tx.delete(results).where(eq(results.id, row.id));
      });
      this.logger.log(`Discarded result: ${row.id}`);
      return { status: 'Ok' };
    } catch (error) {
      this.fail(`Failed to discard result: ${id}`, error);
    }
  }

  /**
   * The cells of an approved regular result that may take a Sup & Sub re-exam
   * (an F or a substitute), with any re-exam mark already entered. Suspended and
   * dismissed students take none.
   */
  async resitCandidates(
    id: string,
    caller: GrCaller,
  ): Promise<ResitCandidateView[]> {
    try {
      const row = await this.resultOrThrow(id, caller);
      if (row.kind !== 'regular' || row.status !== 'approved') {
        throw new ConflictException({ code: 'RESULTS_NOT_APPROVED' });
      }

      const { courses } = row.sheet;
      const cohort = await this.db.query.students.findMany({
        where: and(
          inArray(
            students.id,
            row.sheet.students.map((s) => s.id),
          ),
          eq(students.standing, 'active'),
        ),
        columns: { id: true, uniNumber: true, nameEn: true },
      });
      if (!cohort.length) return [];

      const rows = await this.db.query.grades.findMany({
        where: and(
          inArray(
            grades.studentId,
            cohort.map((s) => s.id),
          ),
          inArray(
            grades.curriculumId,
            courses.map((c) => c.curriculumId),
          ),
        ),
      });
      const studentOf = new Map(cohort.map((s) => [s.id, s]));
      const courseOf = new Map(courses.map((c) => [c.curriculumId, c]));

      const candidates: ResitCandidateView[] = [];
      for (const grade of rows) {
        const kind = resitKindOf(grade);
        const student = studentOf.get(grade.studentId);
        const course = courseOf.get(grade.curriculumId);
        if (!kind || !student || !course) continue;
        const cell = cellOf(grade.curriculumId, grade, true);
        candidates.push({
          gradeId: grade.id,
          studentId: student.id,
          uniNumber: student.uniNumber,
          name: student.nameEn,
          curriculumId: course.curriculumId,
          sNo: course.sNo,
          code: course.code,
          state: cell.state,
          mark: cell.mark,
          letter: cell.letter,
          kind,
          resit: cell.resit
            ? {
                kind: cell.resit.kind,
                grade: cell.resit.mark,
                letter: cell.resit.letter,
              }
            : null,
        });
      }
      return candidates.sort(
        (a, b) => a.uniNumber.localeCompare(b.uniNumber) || a.sNo - b.sNo,
      );
    } catch (error) {
      this.fail(`Failed to list resit candidates: ${id}`, error);
    }
  }
}
