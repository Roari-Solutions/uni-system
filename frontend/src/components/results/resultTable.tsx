import { XMarkIcon } from "@heroicons/react/24/outline";
import type {
	ResultCell,
	ResultCourse,
	ResultSheet,
	ResultStudent,
	ResultVersion,
} from "../../types/result";
import { cellText, totalsText } from "../../utils/resultText";

/**
 * Makes the preview editable. The sheet itself stays English; these labels are
 * the dashboard's own, in its language.
 */
export type ResultTableEditing = {
	/** Whether the student's marks may change (not locked, not frozen). */
	canEdit: (student: ResultStudent) => boolean;
	onCellClick: (student: ResultStudent, cell: ResultCell, course: ResultCourse) => void;
	cellLabel: (student: ResultStudent, course: ResultCourse) => string;
	onRemove: (student: ResultStudent) => void;
	removeLabel: (student: ResultStudent) => string;
	/** The heading of the remove column, for screen readers. */
	removeHeader: string;
};

type ResultTableProps = {
	sheet: ResultSheet;
	version: ResultVersion;
	editing?: ResultTableEditing;
	/** The S.No. of the first row; a printed page after the first carries on from the last. */
	firstNumber?: number;
};

// a thin rule on every cell, as on the university's printed sheet
const cell = "border border-foreground px-1.5 py-1";
// §3.2 header bands: the secondary background, which prints distinct from the white rows
const band = "bg-background-secondary";
// a failing cell: soft accent plus bold, so it stands out from the header bands and
// doesn't lean on colour alone (§39)
const failedCell = "bg-accent-soft font-bold";

/**
 * The results sheet itself: one row per student, one column per curriculum
 * (by S.No.), then the semester's CH, GP and GPA, the year's on a second-
 * semester sheet, and an empty Remarks column. Always English and LTR: it is
 * the exported document, whatever language the dashboard is in.
 */
const ResultTable = ({ sheet, version, editing, firstNumber = 1 }: ResultTableProps) => {
	const yearSheet = sheet.semester === 2;
	// a second-semester sheet ends with the CGPA; one generated before the CGPA was
	// printed keeps the year's CH, GP and GPA it was approved with
	const withCgpa = yearSheet && sheet.students.every((s) => s.cgpa !== undefined);
	const totalColumns = yearSheet && !withCgpa ? ["CH", "GP", "GPA", "CH", "GP", "GPA"] : ["CH", "GP", "GPA"];

	return (
		<table
			dir="ltr"
			lang="en"
			className="w-full border-collapse font-en text-[10px] leading-tight text-foreground [print-color-adjust:exact]"
		>
			<thead className="text-center font-bold">
				<tr>
					<th scope="col" rowSpan={2} className={`${cell} w-8`}>
						S.No.
					</th>
					<th scope="col" rowSpan={2} className={`${cell} text-start`}>
						Index No
					</th>
					<th scope="col" className={`${cell} min-w-36`}>
						Student Name
					</th>
					{sheet.courses.map((c) => (
						<th key={c.curriculumId} scope="col" className={cell}>
							{c.sNo}
						</th>
					))}
					{yearSheet ? (
						<>
							<th scope="colgroup" colSpan={3} className={cell}>
								Semester
							</th>
							{withCgpa ? (
								<th scope="col" rowSpan={2} className={cell}>
									CGPA
								</th>
							) : (
								<th scope="colgroup" colSpan={3} className={cell}>
									Year
								</th>
							)}
						</>
					) : (
						totalColumns.map((label) => (
							<th key={label} scope="col" rowSpan={2} className={cell}>
								{label}
							</th>
						))
					)}
					<th scope="col" rowSpan={2} className={`${cell} min-w-16 text-error`}>
						Remarks
					</th>
					{editing && (
						<th scope="col" rowSpan={2} className={cell}>
							<span className="sr-only">{editing.removeHeader}</span>
						</th>
					)}
				</tr>
				<tr>
					<th scope="row" className={`${cell} text-end`}>
						CH
					</th>
					{sheet.courses.map((c) => (
						<td key={c.curriculumId} className={`${cell} ${band}`}>
							{c.hours}
						</td>
					))}
					{yearSheet &&
						totalColumns.map((label, i) => (
							<th key={i} scope="col" className={cell}>
								{label}
							</th>
						))}
				</tr>
			</thead>
			<tbody className="text-center">
				{sheet.students.map((student, index) => {
					const semester = totalsText(student.semester);
					const year = student.year ? totalsText(student.year) : null;
					return (
						<tr key={student.id} className="break-inside-avoid">
							<td className={cell}>{firstNumber + index}</td>
							<td className={`${cell} text-start font-semibold`}>{student.uniNumber}</td>
							<td className={`${cell} text-start font-semibold`}>{student.name}</td>
							{student.cells.map((c, i) => {
								const { text, failed } = cellText(c, version, sheet.kind);
								const course = sheet.courses[i];
								const editable = editing && course && editing.canEdit(student);
								return (
									<td
										key={c.curriculumId}
										className={`${cell} whitespace-nowrap ${failed ? failedCell : ""} ${editable ? "p-0" : ""}`}
									>
										{editable ? (
											<button
												type="button"
												onClick={() => editing.onCellClick(student, c, course)}
												aria-label={editing.cellLabel(student, course)}
												title={editing.cellLabel(student, course)}
												className="h-full min-h-6 w-full px-1.5 py-1 transition-colors duration-150 ease-out hover:bg-background"
											>
												{text}
											</button>
										) : (
											text
										)}
									</td>
								);
							})}
							<td className={cell}>{semester.ch}</td>
							<td className={cell}>{semester.gp}</td>
							<td className={cell}>{semester.gpa}</td>
							{withCgpa ? (
								<td className={`${cell} font-bold`}>{student.cgpa == null ? "—" : student.cgpa.toFixed(2)}</td>
							) : (
								year && (
									<>
										<td className={cell}>{year.ch}</td>
										<td className={cell}>{year.gp}</td>
										<td className={cell}>{year.gpa}</td>
									</>
								)
							)}
							{/* left blank for the board to write in */}
							<td className={cell} />
							{editing && (
								<td className={`${cell} p-0`}>
									<button
										type="button"
										onClick={() => editing.onRemove(student)}
										aria-label={editing.removeLabel(student)}
										title={editing.removeLabel(student)}
										className="flex w-full items-center justify-center p-1 transition-colors duration-150 ease-out hover:bg-background hover:text-error"
									>
										<XMarkIcon className="size-4" aria-hidden />
									</button>
								</td>
							)}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
};

export default ResultTable;
