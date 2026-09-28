import type { ReactNode } from "react";
import type { ResultHeader, ResultSheet, ResultVersion } from "../../types/result";
import { dateText, levelText, sheetTitle, versionText } from "../../utils/resultText";
import ResultTable from "./resultTable";

// the printed keys, as on the university's sheet
const ACADEMIC_STATUS: [string, string][] = [
	["Crg", "Ceased Registration"],
	["Cro", "Carry Over"],
	["Dsc", "Discontinued"],
	["Dsm", "Dismissed"],
	["Frz", "Freeze"],
	["Pas", "Pass"],
	["Prm", "Promoted"],
	["Rad", "Readmitted"],
	["Rdo", "Redo"],
	["Rej", "Rejected"],
	["Rpt", "Repeated"],
	["Rrg", "Re-registration"],
	["Rst", "Resit"],
	["Rtk", "Retake"],
	["Sub", "Substitute"],
	["Sup", "Supplementary"],
	["Sus", "Suspension"],
];

const ACADEMIC_HISTORY: [string, string][] = [
	["Ci", "Ceased Registration"],
	["Ei", "Resit"],
	["Gi", "Re-registration"],
	["Oi", "Redo"],
	["Ri", "Repeat"],
	["Si", "Suspension"],
	["Ti", "Transferred"],
	["Ui", "Up-graded"],
	["Xi", "External Candidate"],
	["Zi", "Freezing"],
];

// the system's own scale (letter-grade.ts): F is below 40, D is 40-49
const GRADING: [string, string, string, string][] = [
	["A", "4.00", "≥ 80 %", "Excellent"],
	["B+", "3.50", "70 - 79 %", "Very Good"],
	["B", "3.00", "60 - 69 %", "Good"],
	["C+", "2.50", "55 - 59 %", "Pass"],
	["C", "2.00", "50 - 54 %", "Pass"],
	["D", "1.00", "40 - 49 %", "Con. Pass"],
	["F", "0.00", "< 40 %, Abs, Bar", "Fail"],
];

const SYMBOLS: [string, string][] = [
	["CH", "Credit Hours"],
	["GP", "Grade Point"],
	["GPA", "Grade Point Average"],
	["@", "Cheating"],
	["*", "Grade after Supplementary"],
	["**", "Grade after Substitute"],
	["inc", "Incomplete"],
	["sub", "Substitute (excused)"],
	["Abs", "Absent"],
	["Bar", "Barred"],
];

const cell = "border border-foreground px-1.5 py-px";
const band = "bg-background-secondary font-bold";

/** A typed header value, or a dotted line to fill in by hand. */
const Fill = ({ value }: { value: string }) =>
	value ? <span className="font-bold">{value}</span> : <span aria-hidden>……………</span>;

/** The logo's place until the file is supplied. */
const LogoPlaceholder = () => (
	<div className="flex size-16 shrink-0 items-center justify-center border border-dashed border-foreground text-[10px]">
		[LOGO]
	</div>
);

/** Two-column key tables split a list into symbol/meaning pairs side by side. */
const PairedKey = ({ title, head, rows }: { title: string; head: [string, string]; rows: [string, string][] }) => {
	const half = Math.ceil(rows.length / 2);
	const left = rows.slice(0, half);
	const right = rows.slice(half);
	return (
		<table className="w-full border-collapse">
			<thead>
				<tr>
					<th colSpan={4} className={`${cell} ${band}`}>
						{title}
					</th>
				</tr>
				<tr>
					<th className={cell}>{head[0]}</th>
					<th className={cell}>{head[1]}</th>
					<th className={cell}>{head[0]}</th>
					<th className={cell}>{head[1]}</th>
				</tr>
			</thead>
			<tbody>
				{left.map(([symbol, meaning], i) => (
					<tr key={symbol}>
						<td className={cell}>{symbol}</td>
						<td className={cell}>{meaning}</td>
						<td className={cell}>{right[i]?.[0] ?? ""}</td>
						<td className={cell}>{right[i]?.[1] ?? ""}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

type ResultDocumentProps = {
	header: ResultHeader;
	sheet: ResultSheet;
	version: ResultVersion;
};

/** The title block every page opens with. */
const TitleBlock = ({ header, sheet, version }: ResultDocumentProps) => (
	<header className="mb-2 flex items-start justify-between gap-4">
		<LogoPlaceholder />
		<div className="flex flex-col items-center text-center text-[12px] leading-tight">
			<p className="text-[15px] font-bold">University of Technology</p>
			<p>
				College of <Fill value={sheet.college} />
			</p>
			<p>
				B.A. Program <Fill value={header.program} />
			</p>
			<p>
				Batch <Fill value={header.batch} />
			</p>
			<p>
				Level <Fill value={levelText(sheet.academicYear)} />
			</p>
			{sheet.specialization && (
				<p>
					Specialization <Fill value={sheet.specialization} />
				</p>
			)}
			<p>
				Academic Year <Fill value={header.academicYearLabel} />
			</p>
			<p className="font-bold">{sheetTitle(sheet.semester, sheet.kind)}</p>
			<p className="text-[11px] font-semibold uppercase tracking-wide">{versionText(version)}</p>
		</div>
		<LogoPlaceholder />
	</header>
);

/** The exam and board dates; only the second semester's (year) result goes to the central board. */
const Dates = ({ header, semester }: { header: ResultHeader; semester: number }) => (
	<div className="mb-3 flex justify-between border-b border-dotted border-foreground pb-1 text-[11px]">
		<span>
			Date of Exam <Fill value={dateText(header.examDate)} />
		</span>
		<span>
			Date of College Board <Fill value={dateText(header.collegeBoardDate)} />
		</span>
		{semester === 2 && (
			<span>
				Date of Central Board <Fill value={dateText(header.centralBoardDate)} />
			</span>
		)}
	</div>
);

const Signatures = () => (
	<footer className="mt-4 flex break-inside-avoid justify-between border-t border-dotted border-foreground pt-2 text-[11px] font-bold">
		{["Examination Officer's", "College Registrar", "Dean of the College"].map((role) => (
			<div key={role} className="flex w-48 flex-col gap-3">
				<span>{role}</span>
				<span aria-hidden className="font-normal">
					……………………………
				</span>
			</div>
		))}
	</footer>
);

/**
 * One printed A4 page; every page after the first starts on a new sheet. `fit`
 * tells the print view how to scale it down when it doesn't fit: the cover to
 * one whole page, the table to the page's width (its rows run on over pages).
 */
const Page = ({ children, first, fit }: { children: ReactNode; first?: boolean; fit: "page" | "width" }) => (
	<section data-fit={fit} className={`p-2 ${first ? "" : "break-before-page"}`}>
		{children}
	</section>
);

/**
 * The exported results. The board's copy opens with a cover page (the header,
 * the courses key and every key the sheet uses); the final results handed out
 * to students are the table alone. English and LTR throughout.
 */
const ResultDocument = ({ header, sheet, version }: ResultDocumentProps) => {
	const totalHours = sheet.courses.reduce((acc, c) => acc + c.hours, 0);

	return (
		// print sizes, not the screen type scale: the cover and the widest sheet must each fit one A4 landscape page
		<div
			dir="ltr"
			lang="en"
			className="bg-surface font-en text-[10px] leading-tight text-foreground [print-color-adjust:exact]"
		>
			{version === "board" && (
				<Page first fit="page">
					<TitleBlock header={header} sheet={sheet} version={version} />
					<Dates header={header} semester={sheet.semester} />

					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col gap-3">
							<table className="w-full border-collapse">
								<thead>
									<tr>
										<th colSpan={4} className={`${cell} ${band}`}>
											Courses Key
										</th>
									</tr>
									<tr>
										<th className={cell}>S.No.</th>
										<th className={cell}>Code</th>
										<th className={cell}>Name</th>
										<th className={cell}>Credit Hours</th>
									</tr>
								</thead>
								<tbody>
									{sheet.courses.map((c) => (
										<tr key={c.curriculumId}>
											<td className={`${cell} text-center`}>{c.sNo}</td>
											<td className={cell}>{c.code ?? ""}</td>
											<td className={cell}>{c.name}</td>
											<td className={`${cell} text-center`}>{c.hours}</td>
										</tr>
									))}
									<tr>
										<td colSpan={3} className={`${cell} ${band} text-center`}>
											Total
										</td>
										<td className={`${cell} ${band} text-center`}>{totalHours}</td>
									</tr>
								</tbody>
							</table>

							<table className="w-full border-collapse">
								<thead>
									<tr>
										<th colSpan={4} className={`${cell} ${band}`}>
											Grading System
										</th>
									</tr>
									<tr>
										<th className={cell}>Grade</th>
										<th className={cell}>Points</th>
										<th className={cell}>Marks</th>
										<th className={cell}>Remarks</th>
									</tr>
								</thead>
								<tbody>
									{GRADING.map(([grade, points, marks, remark]) => (
										<tr key={grade}>
											<td className={`${cell} text-center`}>{grade}</td>
											<td className={`${cell} text-center`}>{points}</td>
											<td className={cell}>{marks}</td>
											<td className={cell}>{remark}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="flex flex-col gap-3">
							<PairedKey title="Academic Status Key" head={["Symbol", "Academic status"]} rows={ACADEMIC_STATUS} />
							<div>
								<PairedKey
									title="Academic History Key"
									head={["Symbol", "Academic history"]}
									rows={ACADEMIC_HISTORY}
								/>
								<p className="mt-1">The subscript (i) is a variable indicating the academic year.</p>
							</div>
							<PairedKey title="Symbols" head={["Symbol", "Meaning"]} rows={SYMBOLS} />
						</div>
					</div>

					<Signatures />
				</Page>
			)}

			<Page first={version === "final"} fit="width">
				<TitleBlock header={header} sheet={sheet} version={version} />
				{/* without the cover, the final results carry the dates themselves */}
				{version === "final" && <Dates header={header} semester={sheet.semester} />}
				<ResultTable sheet={sheet} version={version} />
				<Signatures />
			</Page>
		</div>
	);
};

export default ResultDocument;
