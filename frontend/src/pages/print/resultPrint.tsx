import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PrinterIcon } from "@heroicons/react/24/outline";
import ResultDocument from "../../components/results/resultDocument";
import { fetchResult } from "../../api/results";
import type { Result, ResultVersion } from "../../types/result";
import { submitButtonClass } from "../../styles/form";
import { levelText } from "../../utils/resultText";
import { isStudentOrder, orderSheet, type StudentOrder } from "../../utils/studentOrder";

// A4 landscape with 8mm margins, and room below for the page number; the page
// background prints white whatever the dashboard's canvas is
const MARGIN_MM = 8;
const FOOTER_MM = 12;
// "Page 2 of 5" is written by the browser in the page's margin (Chrome and Edge
// 131+). Margin boxes can't read the theme's variables, so the colour is the
// foreground token's value (#1b2a38).
const PRINT_CSS = `
@page {
  size: A4 landscape;
  margin: ${MARGIN_MM}mm ${MARGIN_MM}mm ${FOOTER_MM}mm;
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    font-family: Inter, sans-serif;
    font-size: 9px;
    color: #1b2a38;
  }
}
@media print { body { background: var(--color-surface); } }
`;

// the printable area in CSS pixels (96 per inch)
const PX_PER_MM = 96 / 25.4;
const PAGE_WIDTH = (297 - 2 * MARGIN_MM) * PX_PER_MM;
const PAGE_HEIGHT = (210 - MARGIN_MM - FOOTER_MM) * PX_PER_MM;

/**
 * Scales down any page that doesn't fit: the cover to one whole page, the
 * table to the page's width, so a wide batch (16 curriculums and the year's
 * totals) prints whole instead of being cut off.
 */
const fitPages = () => {
	for (const page of document.querySelectorAll<HTMLElement>("[data-fit]")) {
		page.style.zoom = "";
		const byWidth = PAGE_WIDTH / page.scrollWidth;
		const byHeight = page.dataset.fit === "page" ? PAGE_HEIGHT / page.scrollHeight : 1;
		const zoom = Math.min(1, byWidth, byHeight);
		if (zoom < 1) page.style.zoom = String(zoom);
	}
};

/**
 * The exported results, alone on the page so the browser's "Save as PDF"
 * captures only the document. It opens the print dialog once the sheet has
 * rendered; the button reopens it.
 */
const ResultPrint = () => {
	const { t } = useTranslation();
	const { resultId = "" } = useParams();
	const [searchParams] = useSearchParams();
	// only an approved result has a final version
	const requested: ResultVersion = searchParams.get("version") === "final" ? "final" : "board";
	// the order the students were in on the page the export came from
	const orderParam = searchParams.get("order");
	const order: StudentOrder = isStudentOrder(orderParam) ? orderParam : "";

	const [result, setResult] = useState<Result | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		fetchResult(resultId)
			.then((row) => {
				if (!cancelled) setResult(row);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
		};
	}, [resultId]);

	const version: ResultVersion = result?.status === "approved" ? requested : "board";

	useEffect(() => {
		if (!result) return;
		// the saved PDF takes the page title as its file name
		const { sheet } = result;
		document.title = [
			version === "board" ? "Board Results" : "Final Results",
			sheet.college,
			sheet.specialization ?? "",
			levelText(sheet.academicYear),
			sheet.acceptanceYear,
			`Semester ${sheet.semester}`,
			sheet.kind === "resit" ? "Sup & Sub" : "",
		]
			.filter(Boolean)
			.join(" - ");
		// measure once the fonts are in, then hand the laid-out pages to the dialog
		let cancelled = false;
		void document.fonts.ready.then(() => {
			if (cancelled) return;
			fitPages();
			window.print();
		});
		return () => {
			cancelled = true;
		};
	}, [result, version]);

	if (failed) {
		return (
			<p role="alert" className="p-8 text-body-sm text-error">
				{t("common.loadFailed")}
			</p>
		);
	}
	if (!result) {
		return (
			<p role="status" className="p-8 text-body-md text-foreground">
				{t("common.loading")}
			</p>
		);
	}

	return (
		<main className="min-h-svh bg-surface">
			<style>{PRINT_CSS}</style>
			<div className="flex justify-end gap-3 border-b border-border p-4 print:hidden">
				<button type="button" onClick={() => window.print()} className={submitButtonClass}>
					<PrinterIcon className="me-2 size-5" aria-hidden />
					{t("results.printAgain")}
				</button>
			</div>
			{/* laid out at the printable width, so what fits here fits the page */}
			<div className="mx-auto w-[281mm] py-4 print:py-0">
				<ResultDocument header={result.header} sheet={orderSheet(result.sheet, order)} version={version} />
			</div>
		</main>
	);
};

export default ResultPrint;
