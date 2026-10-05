import { XMarkIcon } from "@heroicons/react/24/outline";
import type {
	ResultCell,
	ResultCourse,
	ResultSheet,
	ResultStudent,
	ResultVersion,
} from "../../types/result";
import { autoRemark, remarkOf, remarkText, resitCounts, type RemarkChoices } from "../../utils/remarks";
import RemarkPicker from "./remarkPicker";
import { cellText, ownSemester, printedName, totalsText } from "../../utils/resultText";

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

/** While a result can still change: each student's remark picked from the status key. */
export type RemarkEditing = {
	/** A code, "" for a blank cell, or undefined to go back to the automatic remark. */
	onChange: (student: ResultStudent, choice: RemarkChoices[string] | undefined) => void;
	label: (student: ResultStudent) => string;
};

/** While a result can still change: words added after each student's name. */
export type NameEditing = {
	onChange: (student: ResultStudent, addition: string) => void;
	label: (student: ResultStudent) => string;
	placeholder: string;
};

type ResultTableProps = {
	sheet: ResultSheet;
	version: ResultVersion;
	editing?: ResultTableEditing;
	/** Each student's chosen remark; undefined on results from before remarks, which print none. */
	remarks?: RemarkChoices;
	remarkEditing?: RemarkEditing;
	/** Words added after each student's name on this result, by student id. */
	nameAdditions?: Record<string, string>;
	nameEditing?: NameEditing;
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
 * (by S.No.; a second-semester sheet ends the year, so it leads with the first
 * semester's), then the semester's CH, GP and GPA, the CGPA on a second-
 * semester sheet, and the Remarks column. Always English and LTR: it is
 * the exported document, whatever language the dashboard is in.
 */
const ResultTable = ({
	sheet,
	version,
	editing,
	remarks,
	remarkEditing,
	nameAdditions,
	nameEditing,
	firstNumber = 1,
}: ResultTableProps) => {
	const yearSheet = sheet.semester === 2;
	// a second-semester sheet ends with the CGPA; one generated before the CGPA was
	// printed keeps the year's CH, GP and GPA it was approved with
	const withCgpa = yearSheet && sheet.students.every((s) => s.cgpa !== undefined);
	// only that older sheet heads its two sets of totals "Semester" and "Year"
	const grouped = yearSheet && !withCgpa;
	const totalColumns = grouped ? ["CH", "GP", "GPA", "CH", "GP", "GPA"] : ["CH", "GP", "GPA"];

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
					{grouped ? (
						<>
							<th scope="colgroup" colSpan={3} className={cell}>
								Semester
							</th>
							<th scope="colgroup" colSpan={3} className={cell}>
								Year
							</th>
						</>
					) : (
						<>
							{totalColumns.map((label) => (
								<th key={label} scope="col" rowSpan={2} className={cell}>
									{label}
								</th>
							))}
							{withCgpa && (
								<th scope="col" rowSpan={2} className={cell}>
									CGPA
								</th>
							)}
						</>
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
					{grouped &&
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
					const remark = remarkOf(student, sheet, remarks);
					return (
						<tr key={student.id} className="break-inside-avoid">
							<td className={cell}>{firstNumber + index}</td>
							<td className={`${cell} text-start font-semibold`}>{student.uniNumber}</td>
							<td className={`${cell} text-start font-semibold`}>
								{nameEditing ? (
									// the name stays as it is; what's typed beside it prints after it
									<span className="flex flex-wrap items-center gap-1">
										<span>{student.name}</span>
										<input
											type="text"
											dir="ltr"
											lang="en"
											maxLength={100}
											autoComplete="off"
											aria-label={nameEditing.label(student)}
											title={nameEditing.label(student)}
											placeholder={nameEditing.placeholder}
											value={nameAdditions?.[student.id] ?? ""}
											onChange={(e) => nameEditing.onChange(student, e.target.value)}
											className="h-6 min-w-14 max-w-full rounded-xs border border-dashed border-border bg-transparent px-1 text-[10px] font-semibold text-accent-deep outline-none transition-colors duration-150 ease-out field-sizing-content placeholder:font-normal placeholder:text-primary-hover hover:border-border-accent focus:border-solid focus:border-primary focus:ring-2 focus:ring-primary/25"
										/>
									</span>
								) : (
									printedName(student.name, nameAdditions?.[student.id])
								)}
							</td>
							{student.cells.map((c, i) => {
								const { text, failed } = cellText(c, version);
								const course = sheet.courses[i];
								// the first semester's columns on a second-semester sheet are its approved result
								const editable = editing && ownSemester(course, sheet) && editing.canEdit(student);
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
							{remarkEditing ? (
								<td className={`${cell} p-0`}>
									<RemarkPicker
										label={remarkEditing.label(student)}
										text={remark.text}
										automaticText={remarkText(student, autoRemark(student, sheet), true)}
										counts={resitCounts(student)}
										// a chosen Sup or Sub with nothing left to count stands as automatic
										choice={remark.automatic ? undefined : remarks?.[student.id]}
										onChange={(choice) => remarkEditing.onChange(student, choice)}
									/>
								</td>
							) : (
								// the remark, or blank for the board to write in
								<td className={`${cell} whitespace-nowrap font-semibold`}>{remark.text}</td>
							)}
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
