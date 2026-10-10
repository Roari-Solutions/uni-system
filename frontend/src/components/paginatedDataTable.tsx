import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { Column } from "./dataTable";

// a row never gets shorter than this; the page size is how many fit
const MIN_ROW_PX = 64;
const HEAD_PX = 52;
// on a phone each row becomes a card, so pages hold a fixed number of them
const CARDS_PER_PAGE = 4;

/** True from the md breakpoint (768px) up. */
const useIsWide = () => {
	const query = "(min-width: 768px)";
	const [wide, setWide] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(query).matches));
	useEffect(() => {
		const media = window.matchMedia(query);
		const onChange = () => setWide(media.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);
	return wide;
};

type Props<T> = {
	columns: Column<T>[];
	rows: T[];
	getRowId: (row: T) => string;
	emptyText: string;
	/** Makes whole rows clickable; links and buttons inside a row keep their own click. */
	onRowClick?: (row: T) => void;
	/** false: one page with every row, stretched to fill the card, and no pager. Default true. */
	paginated?: boolean;
	/** Extra classes for a row, e.g. a tint for rows that need attention. */
	rowClassName?: (row: T) => string;
	/** On a phone, only these columns (by key) show on each card. Default: all of them. */
	mobileColumns?: string[];
	/** Width in px of the "actions" column on a wide screen. Default 120. */
	actionsWidth?: number;
};

/** The page numbers to show: a window of up to five around the current one. */
const pageWindow = (current: number, pages: number) => {
	const size = Math.min(5, pages);
	const first = Math.min(Math.max(1, current - Math.floor(size / 2)), pages - size + 1);
	return Array.from({ length: size }, (_, i) => first + i);
};

/**
 * Same props as DataTable, but it fills the space it is placed in: rows share
 * the height equally, the page size follows the available height, and nothing
 * scrolls. Put it in a flex column with `min-h-0 flex-1` room.
 */
const PaginatedDataTable = <T,>({ columns, rows, getRowId, emptyText, onRowClick, paginated = true, rowClassName, mobileColumns, actionsWidth = 120 }: Props<T>) => {
	const { t } = useTranslation();
	const box = useRef<HTMLDivElement>(null);
	const [avail, setAvail] = useState(0);
	const [page, setPage] = useState(1);
	const wide = useIsWide();

	useLayoutEffect(() => {
		const el = box.current;
		if (!el) return;
		const measure = () => setAvail(Math.max(0, el.clientHeight - HEAD_PX));
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const empty = rows.length === 0;
	const perPage = !paginated
		? Math.max(1, rows.length)
		: !wide
			? CARDS_PER_PAGE
			: empty || avail <= 0
				? 1
				: Math.max(1, Math.floor(avail / MIN_ROW_PX));
	const pages = Math.max(1, Math.ceil(rows.length / perPage));
	const current = Math.min(page, pages);
	const start = (current - 1) * perPage;
	const slice = rows.slice(start, start + perPage);
	// unpaginated: rows stretch to fill the card, but never get shorter than the minimum
	const rowHeight = avail > 0 ? (paginated ? avail / perPage : Math.max(MIN_ROW_PX, avail / perPage)) : undefined;
	const from = empty ? 0 : start + 1;
	const to = start + slice.length;

	const cell = "overflow-hidden break-words border-t border-muted px-4 py-1 align-middle";
	const pagerButton =
		"inline-grid h-10 min-w-10 place-items-center rounded-lg border border-border px-2 text-navigation font-semibold transition-colors duration-150 ease-out enabled:hover:border-accent-dark enabled:hover:text-accent-dark disabled:opacity-40";

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
			<div ref={box} className={`min-h-0 flex-1 ${paginated && wide ? "overflow-hidden" : "overflow-y-auto"}`}>
				{!wide ? (
					empty ? (
						<p className="p-8 text-center text-body-md text-foreground">{emptyText}</p>
					) : (
						<>
							{/* the select-all checkbox lives in the header on a wide screen */}
							{columns.find((c) => c.key === "select")?.headerContent && (
								<label className="flex items-center gap-3 border-b border-muted px-4 py-3 text-body-sm text-foreground">
									{columns.find((c) => c.key === "select")?.headerContent}
									{columns.find((c) => c.key === "select")?.header}
								</label>
							)}
							<ul className="flex flex-col gap-3 p-3">
						{slice.map((row) => {
							const cols = columns.filter(
								(c) => c.key !== "select" && c.key !== "actions" && (!mobileColumns || mobileColumns.includes(c.key)),
							);
							const select = columns.find((c) => c.key === "select");
							const actions = columns.find((c) => c.key === "actions");
							const [title, ...rest] = cols;
							return (
								<li
									key={getRowId(row)}
									className={`rounded-lg border border-border bg-background/40 p-4 ${onRowClick ? "cursor-pointer" : ""} ${rowClassName?.(row) ?? ""}`}
									onClick={
										onRowClick
											? (e) => {
													if ((e.target as HTMLElement).closest("a,button,input")) return;
													onRowClick(row);
												}
											: undefined
									}
								>
									<div className="flex items-start gap-3">
										{select && <div className="pt-0.5">{select.render(row)}</div>}
										<div className="min-w-0 flex-1 text-body-md font-semibold text-foreground">
											{title?.render(row)}
										</div>
									</div>
									<dl className="mt-3 flex flex-col gap-2">
										{rest.map((c) => (
											<div key={c.key} className="flex items-start justify-between gap-4 text-body-sm">
												<dt className="shrink-0 text-muted-foreground">{c.header}</dt>
												<dd className="min-w-0 flex-1 break-words text-end text-foreground">{c.render(row)}</dd>
											</div>
										))}
									</dl>
									{actions && (
										<div className="mt-3 flex justify-end border-t border-muted pt-3">{actions.render(row)}</div>
									)}
								</li>
							);
						})}
					</ul>
						</>
					)
				) : (
					<table className="w-full table-fixed border-collapse text-start text-body-md text-foreground">
						{/* the checkbox and actions columns get a fixed width; the rest share what is left */}
						<colgroup>
							{columns.map((c) => (
								<col
									key={c.key}
									style={c.key === "select" ? { width: 56 } : c.key === "actions" ? { width: actionsWidth } : undefined}
								/>
							))}
						</colgroup>
						<thead>
							<tr className="bg-footer text-footer-foreground" style={{ height: HEAD_PX }}>
								{columns.map((c) => (
									<th
										key={c.key}
										scope="col"
										className="overflow-hidden break-words px-4 text-start text-body-sm font-semibold leading-tight"
									>
										{c.headerContent ?? c.header}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{empty ? (
								<tr style={{ height: rowHeight }}>
									<td colSpan={columns.length} className={`${cell} border-t-0 text-center`}>
										{emptyText}
									</td>
								</tr>
							) : (
								<>
									{slice.map((row, i) => (
										<tr
											key={getRowId(row)}
											className={`transition-colors duration-150 ease-out hover:bg-background ${onRowClick ? "cursor-pointer" : ""} ${rowClassName?.(row) ?? ""}`}
											style={{ height: rowHeight }}
											onClick={
												onRowClick
													? (e) => {
															if ((e.target as HTMLElement).closest("a,button")) return;
															onRowClick(row);
														}
													: undefined
											}
										>
											{columns.map((c) => (
												<td key={c.key} className={`${cell} ${i === 0 ? "border-t-0" : ""} ${c.key === columns[0].key ? "font-semibold" : ""}`}>
													{c.render(row)}
												</td>
											))}
										</tr>
									))}
									{/* keep every page the same height, so the card never has a gap */}
									{Array.from({ length: perPage - slice.length }, (_, i) => (
										<tr key={`blank-${i}`} aria-hidden="true" style={{ height: rowHeight }}>
										{columns.map((c) => (
											<td key={c.key} className="p-0" />
									))}
									</tr>
									))}
								</>
							)}
						</tbody>
					</table>
			
				)}
			</div>

			{paginated && (
			<div className="flex min-h-16 shrink-0 flex-wrap items-center justify-center gap-2 border-t border-border bg-card px-3 py-2 sm:justify-between sm:px-5">
				<span className="text-body-sm text-foreground">
					{t("common.pagination.range", {
						from,
						to,
						total: rows.length,
						defaultValue: "Showing {{from}}–{{to}} of {{total}}",
					})}
				</span>
				<nav aria-label={t("common.pagination.label", { defaultValue: "Pagination" })} className="flex items-center gap-1.5">
					<button
						type="button"
						disabled={current === 1}
						onClick={() => setPage(current - 1)}
						aria-label={t("common.pagination.previous", { defaultValue: "Previous" })}
						className={pagerButton}
					>
						<ChevronLeftIcon className="size-5 rtl:rotate-180" aria-hidden />
					</button>
					{pageWindow(current, pages).map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => setPage(p)}
							aria-current={p === current ? "page" : undefined}
							aria-label={t("common.pagination.page", { page: p, defaultValue: "Page {{page}}" })}
							className={`${pagerButton} ${p === current ? "!border-accent bg-accent text-accent-foreground" : "bg-card"}`}
						>
							{p}
						</button>
					))}
					<button
						type="button"
						disabled={current === pages}
						onClick={() => setPage(current + 1)}
						aria-label={t("common.pagination.next", { defaultValue: "Next" })}
						className={pagerButton}
					>
						<ChevronRightIcon className="size-5 rtl:rotate-180" aria-hidden />
					</button>
				</nav>
			</div>
			)}
		</div>
	);
};

export default PaginatedDataTable;
