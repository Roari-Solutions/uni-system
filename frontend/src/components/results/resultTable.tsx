import type { ResultSheet, ResultVersion } from "../../types/result";
import { cellText, totalsText } from "../../utils/resultText";

type ResultTableProps = {
	sheet: ResultSheet;
	version: ResultVersion;
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
const ResultTable = ({ sheet, version }: ResultTableProps) => {
	const yearSheet = sheet.semester === 2;
	const totalColumns = yearSheet ? ["CH", "GP", "GPA", "CH", "GP", "GPA"] : ["CH", "GP", "GPA"];

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
							<th scope="colgroup" colSpan={3} className={cell}>
								Year
							</th>
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
							<td className={cell}>{index + 1}</td>
							<td className={`${cell} text-start font-semibold`}>{student.uniNumber}</td>
							<td className={`${cell} text-start font-semibold`}>{student.name}</td>
							{student.cells.map((c) => {
								const { text, failed } = cellText(c, version, sheet.kind);
								return (
									<td
										key={c.curriculumId}
										className={`${cell} whitespace-nowrap ${failed ? failedCell : ""}`}
									>
										{text}
									</td>
								);
							})}
							<td className={cell}>{semester.ch}</td>
							<td className={cell}>{semester.gp}</td>
							<td className={cell}>{semester.gpa}</td>
							{year && (
								<>
									<td className={cell}>{year.ch}</td>
									<td className={cell}>{year.gp}</td>
									<td className={cell}>{year.gpa}</td>
								</>
							)}
							{/* left blank for the board to write in */}
							<td className={cell} />
						</tr>
					);
				})}
			</tbody>
		</table>
	);
};

export default ResultTable;
