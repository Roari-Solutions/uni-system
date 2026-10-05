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
import { and, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import {
  gpas,
  faculties,
  facultyCurriculums,
  facultyDepartments,
  specializations,
  grades,
  results,
  resultStudents,
  students,
} from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import {
  assertDepartmentOf,
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
import {
  compareCurriculums,
  groupsOf,
  renumberSerialNos,
} from 'src/curriculums/serial-no';
import { approvedStudents } from './result-lock';
import { takesCurriculum, type StudentTrack } from 'src/common/specialization';
import {
  GenerateResultDto,
  ListResultsQueryDto,
  PreviewResultDto,
  type ResultKind,
} from './dto/results.dto';
import {
  canonicalJson,
  totalsOf,
  yearTotalsOf,
  yearCourses,
  ownSemester,
  cumulativeGpaOf,
  REMARK_CODES,
  type GradePoints,
  type RemarkCode,
  type CellState,
  type ResultCell,
  type ResultCourse,
  type ResultHeader,
  type ResultSheet,
} from './result-sheet';

/** The students one result covers: a level's, of one acceptance year or (null) all of them. */
interface Batch {
  facultyId: string;
  academicYear: AcademicYear;
  acceptanceYear: string | null;
  /** Null for the students without a specialization (the whole batch, where there are none). */
  specializationId: string | null;
  /**
   * Without a specialization: the department whose students without one the
   * result covers; null for the students outside every department. Always null
   * with a specialization, which names its students on its own.
   */
  departmentId: string | null;
  semester: Semester;
}

type ResultRow = typeof results.$inferSelect;
type GradeRow = typeof grades.$inferSelect;

/** A result in the list: everything but the sheet itself. */
export interface ResultSummaryView {
  id: string;
  facultyId: string;
  academicYear: number;
  /** Null when the result covers every acceptance year at the level. */
  acceptanceYear: string | null;
  /** Null for the students without a specialization. */
  specializationId: string | null;
  /** A department's own result (its students without a specialization); null otherwise. */
  departmentId: string | null;
  semester: number;
  kind: ResultKind;
  status: 'pending' | 'approved';
  header: ResultHeader;
  studentCount: number;
  /** Students of the batch left off by hand. */
  excludedStudentIds: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

/** One result with its frozen sheet. */
export interface ResultView extends ResultSummaryView {
  sheet: ResultSheet;
  /** Pending only: the grades have changed since the sheet was generated. */
  stale: boolean;
  /**
   * Each student's acceptance year, by id, read from their record (not frozen
   * into the sheet): the views list the years' groups in ascending order.
   */
  studentAcceptanceYears: Record<string, string>;
}

/** The grade row behind one cell, so the preview can edit it in place. */
export interface CellGradeView {
  gradeId: string;
  grade: number | null;
  seatingStatus: GradeRow['seatingStatus'];
  cheatingResolved: boolean;
}

/** The sheet as it would be generated now, with what the views need to edit it. */
export interface ResultPreviewView {
  sheet: ResultSheet;
  /** Keyed `${studentId}:${curriculumId}`; a cell without a grade row has none. */
  grades: Record<string, CellGradeView>;
  /** Students whose grades for the semester are locked by approved results. */
  lockedStudentIds: string[];
  /** The students left off, so they can be put back. */
  excluded: { id: string; uniNumber: string; name: string }[];
  /** The acceptance years of the students on the sheet, oldest first; they name the batch. */
  acceptanceYears: string[];
  /** Each student's acceptance year, by id, so the views group the students by year. */
  studentAcceptanceYears: Record<string, string>;
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

/** The longest addition to a name, like the header's other typed lines. */
const NAME_ADDITION_MAX = 100;

/**
 * Words added after students' names, trimmed and kept only for students on
 * the sheet; an empty one is dropped. Anything but text, or too long, is a bad request.
 */
function nameAdditionsFor(
  sent: Record<string, string> | undefined,
  sheet: ResultSheet,
): Record<string, string> | undefined {
  if (sent === undefined) return undefined;
  const onSheet = new Set(sheet.students.map((s) => s.id));
  const kept: Record<string, string> = {};
  for (const [studentId, addition] of Object.entries(sent)) {
    if (typeof addition !== 'string' || addition.length > NAME_ADDITION_MAX) {
      throw new BadRequestException({ code: 'INVALID_NAME_ADDITION' });
    }
    const trimmed = addition.trim();
    if (trimmed && onSheet.has(studentId)) kept[studentId] = trimmed;
  }
  return kept;
}

/**
 * The remarks staff chose, kept only for students on the sheet. A value that
 * isn't on the status key (or blank) is a bad request.
 */
function remarksFor(
  sent: Record<string, string> | undefined,
  sheet: ResultSheet,
): Record<string, RemarkCode | ''> | undefined {
  if (sent === undefined) return undefined;
  const allowed = new Set<string>(['', ...REMARK_CODES]);
  const onSheet = new Set(sheet.students.map((s) => s.id));
  const kept: Record<string, RemarkCode | ''> = {};
  for (const [studentId, code] of Object.entries(sent)) {
    if (typeof code !== 'string' || !allowed.has(code)) {
      throw new BadRequestException({ code: 'INVALID_REMARK' });
    }
    if (onSheet.has(studentId)) kept[studentId] = code as RemarkCode | '';
  }
  return kept;
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

  /**
   * The curriculums a faculty offers in one year and semester that the batch's
   * students take (the shared ones, and the majors of their specialization and
   * department, or of none): university, then faculty, then specialization
   * requirements, each by abbreviation, which is also their S.No. order.
   */
  private async coursesOf(
    facultyId: string,
    academicYear: AcademicYear,
    semester: Semester,
    track: StudentTrack,
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
            requirementType: true,
            specializationId: true,
            departmentId: true,
          },
        },
      },
    });
    return links
      .filter(
        (l) =>
          l.curriculum.academicYear === academicYear &&
          l.curriculum.semester === semester &&
          takesCurriculum(track, l.curriculum),
      )
      .sort((a, b) =>
        compareCurriculums(
          {
            curriculumId: a.curriculum.id,
            code: a.curriculum.abbreviation,
            requirementType: a.curriculum.requirementType,
          },
          {
            curriculumId: b.curriculum.id,
            code: b.curriculum.abbreviation,
            requirementType: b.curriculum.requirementType,
          },
        ),
      )
      .map((l) => ({
        sNo: l.serialNo ?? 0,
        curriculumId: l.curriculum.id,
        code: l.curriculum.abbreviation,
        name: l.curriculum.nameEn,
        hours: l.curriculum.courseHours,
      }));
  }

  /** The sheet as it would be generated now. */
  private async buildSheet(
    batch: Batch,
    kind: ResultKind,
    excluded: string[],
  ): Promise<ResultSheet> {
    return (await this.assemble(batch, kind, excluded)).sheet;
  }

  /**
   * Builds the sheet from the grades as they stand, leaving off the excluded
   * students. A regular sheet shows the semester's own marks; a resit sheet
   * shows the Sup & Sub marks over them. A second-semester sheet ends the year:
   * it shows the first semester's curriculums too, as they finally stand (their
   * resits included), ahead of its own, and adds the year's totals and the
   * CGPA; its CH, GP and GPA stay the second semester's. Also hands back the
   * grade rows and who was left off.
   */
  private async assemble(batch: Batch, kind: ResultKind, excluded: string[]) {
    const faculty = await this.db.query.faculties.findFirst({
      where: eq(faculties.id, batch.facultyId),
      columns: { nameEn: true },
    });
    if (!faculty) throw new BadRequestException();
    const specialization = batch.specializationId
      ? await this.db.query.specializations.findFirst({
          where: eq(specializations.id, batch.specializationId),
          columns: { nameEn: true, facultyId: true, departmentId: true },
        })
      : null;
    if (
      batch.specializationId &&
      specialization?.facultyId !== batch.facultyId
    ) {
      throw new BadRequestException({ code: 'SPECIALIZATION_MISMATCH' });
    }
    // the students' department: the result's own, or the specialization's
    const track: StudentTrack = {
      specializationId: batch.specializationId,
      departmentId: specialization
        ? specialization.departmentId
        : batch.departmentId,
    };
    const department = track.departmentId
      ? await this.db.query.facultyDepartments.findFirst({
          where: eq(facultyDepartments.id, track.departmentId),
          columns: { nameEn: true, facultyId: true },
        })
      : null;
    if (track.departmentId && department?.facultyId !== batch.facultyId) {
      throw new BadRequestException({ code: 'DEPARTMENT_MISMATCH' });
    }

    // S.No.s follow the sheets' order; any placed before that rule get theirs now
    await renumberSerialNos(this.db, [
      ...groupsOf([batch.facultyId], batch.academicYear, '1'),
      ...groupsOf([batch.facultyId], batch.academicYear, '2'),
    ]);
    const courses = await this.coursesOf(
      batch.facultyId,
      batch.academicYear,
      batch.semester,
      track,
    );
    const yearSheet = batch.semester === '2';
    const firstCourses = yearSheet
      ? await this.coursesOf(batch.facultyId, batch.academicYear, '1', track)
      : [];

    const everyone = await this.db.query.students.findMany({
      where: and(
        eq(students.facultyId, batch.facultyId),
        eq(students.academicYear, batch.academicYear),
        batch.acceptanceYear
          ? eq(students.acceptanceYear, batch.acceptanceYear)
          : undefined,
        // one result per specialization, one per department for its students
        // without one, and one for the students with neither
        batch.specializationId
          ? eq(students.specializationId, batch.specializationId)
          : and(
              isNull(students.specializationId),
              batch.departmentId
                ? eq(students.departmentId, batch.departmentId)
                : isNull(students.departmentId),
            ),
      ),
      columns: { id: true, uniNumber: true, nameEn: true, standing: true },
    });
    const left = new Set(excluded);
    const cohort = everyone.filter((s) => !left.has(s.id));
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
    // a Sup & Sub sheet lists only the students who sat a re-exam with a mark
    // entered; their rows still show the whole semester, recalculated
    const semesterIds = new Set(courses.map((c) => c.curriculumId));
    const resat = new Set(
      rows
        .filter((r) => r.resitKind && semesterIds.has(r.curriculumId))
        .map((r) => r.studentId),
    );
    const listed = withResit ? cohort.filter((s) => resat.has(s.id)) : cohort;
    if (!listed.length) throw new BadRequestException({ code: 'NO_RESITS' });

    // the CGPA weighs every earlier year's stored semesters (they follow resits)
    // by their hours; this year's two come from the sheet itself, as the year's
    // totals do
    const level = academicYearToNumber(batch.academicYear);
    const earlierSemesters = new Map<string, GradePoints[]>();
    if (yearSheet) {
      const stored = await this.db.query.gpas.findMany({
        where: inArray(
          gpas.studentId,
          listed.map((s) => s.id),
        ),
        columns: {
          studentId: true,
          academicYear: true,
          gpSum: true,
          courseHours: true,
        },
      });
      for (const row of stored) {
        if (academicYearToNumber(row.academicYear) >= level) continue;
        earlierSemesters.set(row.studentId, [
          ...(earlierSemesters.get(row.studentId) ?? []),
          { gp: Number(row.gpSum), ch: row.courseHours },
        ]);
      }
    }

    const sheet: ResultSheet = {
      college: faculty.nameEn,
      academicYear: academicYearToNumber(batch.academicYear),
      acceptanceYear: batch.acceptanceYear,
      specialization: specialization?.nameEn ?? null,
      department: department?.nameEn,
      semester: semesterToNumber(batch.semester),
      kind,
      // a second-semester sheet's CH, GP and GPA cover the whole year
      ...(yearSheet ? { totals: 'year' as const } : {}),
      courses: yearSheet ? yearCourses(firstCourses, courses) : courses,
      students: listed
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
          const first = totalsOf(firstCells, firstCourses, true);
          const year = yearSheet ? yearTotalsOf([first, semester]) : null;
          return {
            id: s.id,
            uniNumber: s.uniNumber,
            name: s.nameEn,
            standing: s.standing,
            // the first semester's cells lead, as its columns do
            cells: yearSheet ? [...firstCells, ...cells] : cells,
            semester,
            // what a second-semester sheet's CH, GP and GPA print
            year,
            // left off first-semester sheets, so theirs stay exactly as they were
            ...(year
              ? {
                  cgpa: cumulativeGpaOf([
                    ...(earlierSemesters.get(s.id) ?? []),
                    year,
                  ]),
                }
              : {}),
          };
        }),
    };
    return {
      sheet,
      // only the semester's own curriculums are edited from the sheet
      rows: rows.filter((r) =>
        courses.some((c) => c.curriculumId === r.curriculumId),
      ),
      excluded: everyone
        .filter((s) => left.has(s.id))
        .map((s) => ({ id: s.id, uniNumber: s.uniNumber, name: s.nameEn })),
    };
  }

  private batchOf(row: ResultRow): Batch {
    return {
      facultyId: row.facultyId,
      academicYear: row.academicYear,
      acceptanceYear: row.acceptanceYear,
      specializationId: row.specializationId,
      departmentId: row.departmentId,
      semester: row.semester,
    };
  }

  private summaryOf(row: ResultRow): ResultSummaryView {
    return {
      id: row.id,
      facultyId: row.facultyId,
      academicYear: academicYearToNumber(row.academicYear),
      acceptanceYear: row.acceptanceYear,
      specializationId: row.specializationId,
      departmentId: row.departmentId,
      semester: semesterToNumber(row.semester),
      kind: row.kind,
      status: row.status,
      header: row.header,
      studentCount: row.sheet.students.length,
      excludedStudentIds: row.excludedStudentIds,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      approvedAt: isoOrNull(row.approvedAt),
    };
  }

  /** Whether a pending sheet no longer matches the grades. An approved one never goes stale: its grades are locked. */
  private async isStale(row: ResultRow): Promise<boolean> {
    if (row.status !== 'pending') return false;
    try {
      const fresh = await this.buildSheet(
        this.batchOf(row),
        row.kind,
        row.excludedStudentIds,
      );
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
      if (query.acceptanceYear) {
        filters.push(eq(results.acceptanceYear, query.acceptanceYear));
      }
      if (query.specializationId === 'none') {
        filters.push(isNull(results.specializationId));
      } else if (query.specializationId) {
        filters.push(eq(results.specializationId, query.specializationId));
      }
      if (query.departmentId === 'none') {
        filters.push(isNull(results.departmentId));
      } else if (query.departmentId) {
        filters.push(eq(results.departmentId, query.departmentId));
      }
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

  /** The acceptance year of each student on a sheet, by id, as their records hold it. */
  private async acceptanceYearsOf(
    sheet: ResultSheet,
  ): Promise<Record<string, string>> {
    const ids = sheet.students.map((s) => s.id);
    if (!ids.length) return {};
    const rows = await this.db.query.students.findMany({
      where: inArray(students.id, ids),
      columns: { id: true, acceptanceYear: true },
    });
    return Object.fromEntries(rows.map((r) => [r.id, r.acceptanceYear]));
  }

  /** One result with its sheet; a pending one says whether the grades moved since. */
  async getResult(id: string, caller: GrCaller): Promise<ResultView> {
    try {
      const row = await this.resultOrThrow(id, caller);
      return {
        ...this.summaryOf(row),
        sheet: row.sheet,
        stale: await this.isStale(row),
        studentAcceptanceYears: await this.acceptanceYearsOf(row.sheet),
      };
    } catch (error) {
      this.fail(`Failed to read result: ${id}`, error);
    }
  }

  /** Checks the caller may act for the batch's faculty, and names the batch. */
  private async batchFor(
    dto: PreviewResultDto,
    caller: GrCaller,
  ): Promise<Batch> {
    const facultyId = await assertFacultyExists(this.db, dto.facultyId);
    assertFaculty(caller, facultyId);
    // a specialization's result names its students on its own; a department
    // sent with it may only repeat the specialization's
    if (dto.specializationId && dto.departmentId) {
      const spec = await this.db.query.specializations.findFirst({
        where: eq(specializations.id, dto.specializationId),
        columns: { departmentId: true },
      });
      if (spec?.departmentId !== dto.departmentId) {
        throw new BadRequestException({ code: 'DEPARTMENT_MISMATCH' });
      }
    } else if (dto.departmentId) {
      await assertDepartmentOf(this.db, dto.departmentId, facultyId);
    }
    return {
      facultyId,
      academicYear: dto.academicYear,
      acceptanceYear: dto.acceptanceYear ?? null,
      specializationId: dto.specializationId ?? null,
      departmentId: dto.specializationId ? null : (dto.departmentId ?? null),
      semester: dto.semester,
    };
  }

  /**
   * The sheet a batch would get if generated now, without saving anything,
   * plus each cell's grade row so its marks can be corrected in place.
   */
  async previewResult(
    dto: PreviewResultDto,
    caller: GrCaller,
  ): Promise<ResultPreviewView> {
    try {
      const batch = await this.batchFor(dto, caller);
      const { sheet, rows, excluded } = await this.assemble(
        batch,
        dto.kind,
        dto.excludedStudentIds ?? [],
      );
      const studentIds = sheet.students.map((s) => s.id);
      const locked = await approvedStudents(
        this.db,
        studentIds,
        batch.academicYear,
        batch.semester,
      );
      const studentAcceptanceYears = await this.acceptanceYearsOf(sheet);
      return {
        sheet,
        grades: Object.fromEntries(
          rows.map((r) => [
            `${r.studentId}:${r.curriculumId}`,
            {
              gradeId: r.id,
              grade: r.grade === null ? null : Number(r.grade),
              seatingStatus: r.seatingStatus,
              cheatingResolved: r.cheatingResolved,
            },
          ]),
        ),
        lockedStudentIds: [...locked],
        excluded,
        acceptanceYears: [
          ...new Set(Object.values(studentAcceptanceYears)),
        ].sort(),
        studentAcceptanceYears,
      };
    } catch (error) {
      this.fail('Failed to preview result', error);
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
      const batch = await this.batchFor(dto, caller);
      const sameBatch = (kind: ResultKind) =>
        and(
          eq(results.facultyId, batch.facultyId),
          eq(results.academicYear, batch.academicYear),
          batch.acceptanceYear
            ? eq(results.acceptanceYear, batch.acceptanceYear)
            : isNull(results.acceptanceYear),
          batch.specializationId
            ? eq(results.specializationId, batch.specializationId)
            : isNull(results.specializationId),
          batch.departmentId
            ? eq(results.departmentId, batch.departmentId)
            : isNull(results.departmentId),
          eq(results.semester, batch.semester),
          eq(results.kind, kind),
        );

      let excluded = dto.excludedStudentIds ?? [];
      if (dto.kind === 'resit') {
        const regular = await this.db.query.results.findFirst({
          where: sameBatch('regular'),
          columns: { status: true, excludedStudentIds: true },
        });
        if (regular?.status !== 'approved') {
          throw new ConflictException({ code: 'REGULAR_NOT_APPROVED' });
        }
        // the Sup & Sub sheet lists whoever the semester's sheet did, unless told otherwise
        excluded = dto.excludedStudentIds ?? regular.excludedStudentIds;
      }

      const existing = await this.db.query.results.findFirst({
        where: sameBatch(dto.kind),
      });
      if (existing?.status === 'approved') {
        throw new ConflictException({ code: 'ALREADY_APPROVED' });
      }

      const sheet = await this.buildSheet(batch, dto.kind, excluded);
      const remarks = remarksFor(dto.header.remarks, sheet);
      const nameAdditions = nameAdditionsFor(dto.header.nameAdditions, sheet);
      const header: ResultHeader = {
        // left out when not sent, so the sheet prints the default
        ...(dto.header.degree !== undefined
          ? { degree: dto.header.degree.trim() }
          : {}),
        program: dto.header.program.trim(),
        ...(dto.header.resultTitle !== undefined
          ? { resultTitle: dto.header.resultTitle.trim() }
          : {}),
        // the remarks chosen on the sheet, when sent; older results have none
        ...(remarks ? { remarks } : {}),
        ...(nameAdditions ? { nameAdditions } : {}),
        // the signers' names, when sent; older results have none
        ...Object.fromEntries(
          (['examinationOfficer', 'collegeRegistrar', 'dean'] as const)
            .filter((field) => dto.header[field] !== undefined)
            .map((field) => [field, (dto.header[field] ?? '').trim()]),
        ),
        batch: dto.header.batch.trim(),
        academicYearLabel: dto.header.academicYearLabel.trim(),
        examDate: (dto.header.examDate ?? '').trim(),
        collegeBoardDate: (dto.header.collegeBoardDate ?? '').trim(),
        centralBoardDate: (dto.header.centralBoardDate ?? '').trim(),
      };

      const saved = await this.db.transaction(async (tx) => {
        let row: ResultRow;
        if (existing) {
          [row] = await tx
            .update(results)
            .set({ header, sheet, excludedStudentIds: excluded })
            .where(eq(results.id, existing.id))
            .returning();
          await tx
            .delete(resultStudents)
            .where(eq(resultStudents.resultId, existing.id));
        } else {
          [row] = await tx
            .insert(results)
            .values({
              ...batch,
              kind: dto.kind,
              header,
              sheet,
              excludedStudentIds: excluded,
            })
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
      return {
        ...this.summaryOf(saved),
        sheet: saved.sheet,
        stale: false,
        studentAcceptanceYears: await this.acceptanceYearsOf(saved.sheet),
      };
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
        studentAcceptanceYears: await this.acceptanceYearsOf(approved.sheet),
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

      // a second-semester sheet also shows the first semester, which had its own re-exams
      const courses = row.sheet.courses.filter((c) =>
        ownSemester(c, row.sheet.semester),
      );
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
