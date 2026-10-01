import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { REMARKS, type RemarkChoices } from "../../utils/remarks";

// what each option stands for: the automatic remark, a blank cell, or a code from the key
type Choice = RemarkChoices[string] | undefined;

type RemarkPickerProps = {
	/** Read out with the menu, e.g. "Remark for Ahmed Osman Ali". */
	label: string;
	/** What the cell prints now. */
	text: string;
	/** What the automatic remark prints ("" when the rules give none). */
	automaticText: string;
	/** The student's chosen remark; undefined while the automatic one stands. */
	choice: Choice;
	onChange: (choice: Choice) => void;
};

// the panel's width and the most it grows to before it scrolls
const PANEL_WIDTH = 288;
const PANEL_MAX_HEIGHT = 320;
const GAP = 4;
const EDGE = 8;

/**
 * The Remarks cell while a result can still change: it shows the remark as it
 * prints, and opens the academic status key to choose another, go back to the
 * automatic one, or leave the cell blank. The panel opens above the page, so
 * the sheet's scrolling box doesn't cut it off.
 */
const RemarkPicker = ({ label, text, automaticText, choice, onChange }: RemarkPickerProps) => {
	const { t, i18n } = useTranslation();
	const listId = useId();
	const trigger = useRef<HTMLButtonElement>(null);
	const panel = useRef<HTMLUListElement>(null);
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });

	const options: { value: Choice; key: string }[] = [
		{ value: undefined, key: "auto" },
		{ value: "", key: "blank" },
		...REMARKS.map(([code]) => ({ value: code, key: code })),
	];
	const selected = options.findIndex((o) => o.value === choice);
	const [active, setActive] = useState(selected);

	const close = (refocus: boolean) => {
		setOpen(false);
		if (refocus) trigger.current?.focus();
	};

	const pick = (value: Choice) => {
		onChange(value);
		close(true);
	};

	// placed under the cell, its end edge on the cell's, flipped above when there's no room below
	useLayoutEffect(() => {
		if (!open || !trigger.current) return;
		const rect = trigger.current.getBoundingClientRect();
		const left = Math.min(
			Math.max(EDGE, i18n.dir() === "rtl" ? rect.left : rect.right - PANEL_WIDTH),
			window.innerWidth - PANEL_WIDTH - EDGE,
		);
		const roomBelow = window.innerHeight - rect.bottom;
		setPosition(
			roomBelow >= PANEL_MAX_HEIGHT + GAP || roomBelow >= rect.top
				? { left, top: rect.bottom + GAP }
				: { left, bottom: window.innerHeight - rect.top + GAP },
		);
		// without scrolling the page, which would close it again
		panel.current?.focus({ preventScroll: true });
	}, [open, i18n]);

	// a click elsewhere, a scroll of the page or a resize closes it
	useEffect(() => {
		if (!open) return;
		const outside = (e: Event) => {
			const target = e.target as Node;
			if (!panel.current?.contains(target) && !trigger.current?.contains(target)) close(false);
		};
		const away = (e: Event) => {
			if (!panel.current?.contains(e.target as Node)) close(false);
		};
		document.addEventListener("mousedown", outside);
		window.addEventListener("scroll", away, true);
		window.addEventListener("resize", away);
		return () => {
			document.removeEventListener("mousedown", outside);
			window.removeEventListener("scroll", away, true);
			window.removeEventListener("resize", away);
		};
	}, [open]);

	// keep the highlighted option in view as the arrows move it, scrolling the list alone
	useEffect(() => {
		const list = panel.current;
		const item = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
		if (!open || !list || !item) return;
		if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
		else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight)
			list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
	}, [open, active]);

	const onListKey = (e: KeyboardEvent) => {
		const last = options.length - 1;
		const moves: Record<string, number> = {
			ArrowDown: Math.min(last, active + 1),
			ArrowUp: Math.max(0, active - 1),
			Home: 0,
			End: last,
		};
		if (e.key in moves) {
			e.preventDefault();
			setActive(moves[e.key]);
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			pick(options[active].value);
		} else if (e.key === "Escape") {
			e.preventDefault();
			close(true);
		} else if (e.key === "Tab") {
			close(false);
		}
	};

	const optionId = (index: number) => `${listId}-${index}`;
	const automatic = choice === undefined;

	const row = (index: number, content: ReactNode) => {
		const isSelected = index === selected;
		return (
			<li
				key={options[index].key}
				id={optionId(index)}
				data-index={index}
				role="option"
				aria-selected={isSelected}
				// mousedown, so the panel doesn't lose focus before the choice lands
				onMouseDown={(e) => {
					e.preventDefault();
					pick(options[index].value);
				}}
				onMouseEnter={() => setActive(index)}
				className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-body-sm transition-colors duration-150 ease-out ${
					index === active ? "bg-background" : ""
				}`}
			>
				<span className="flex min-w-0 flex-1 items-center gap-3">{content}</span>
				{/* §39 — the check, not the colour alone, marks the choice */}
				<CheckIcon className={`size-4 shrink-0 text-primary-hover ${isSelected ? "" : "invisible"}`} aria-hidden />
			</li>
		);
	};

	return (
		<>
			<button
				ref={trigger}
				type="button"
				aria-label={label}
				title={label}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
				onClick={() => {
					setActive(selected);
					setOpen((o) => !o);
				}}
				onKeyDown={(e) => {
					if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault();
						setActive(selected);
						setOpen(true);
					}
				}}
				className={`group flex h-full min-h-7 w-full items-center justify-between gap-1.5 px-1.5 py-1 transition-colors duration-150 ease-out hover:bg-background ${
					open ? "bg-background" : ""
				}`}
			>
				<span className={`truncate font-semibold ${automatic ? "" : "text-accent-deep"}`}>
					{text || <span className="font-normal text-primary-hover">—</span>}
				</span>
				<span className="flex shrink-0 items-center gap-1">
					{/* the tag tells an automatic (even empty) remark from one chosen by hand */}
					{automatic && (
						<span
							dir={i18n.dir()}
							lang={i18n.language}
							className="rounded-full bg-accent-soft/50 px-1.5 text-[9px] font-medium leading-4 text-accent-deep"
						>
							{t("results.remarkAutoTag")}
						</span>
					)}
					<ChevronDownIcon
						className={`size-3 text-primary-hover transition-transform duration-150 ease-out ${open ? "rotate-180" : ""}`}
						aria-hidden
					/>
				</span>
			</button>

			{open &&
				createPortal(
					<ul
						ref={panel}
						id={listId}
						role="listbox"
						tabIndex={-1}
						aria-label={label}
						aria-activedescendant={optionId(active)}
						onKeyDown={onListKey}
						dir={i18n.dir()}
						lang={i18n.language}
						style={{ left: position.left, top: position.top, bottom: position.bottom, width: PANEL_WIDTH, maxHeight: PANEL_MAX_HEIGHT }}
						className="fixed z-50 overflow-auto rounded-md border border-border bg-surface py-1 text-foreground shadow-lg outline-none transition duration-150 ease-out starting:-translate-y-1 starting:opacity-0"
					>
						{row(
							0,
							<>
								<span className="font-medium text-accent-deep">{t("results.remarkAutomaticOption")}</span>
								<span dir="ltr" className="font-en font-semibold">
									{automaticText || <span className="font-normal text-primary-hover">{t("results.remarkNone")}</span>}
								</span>
							</>,
						)}
						{row(1, <span className="font-medium text-accent-deep">{t("results.remarkBlank")}</span>)}

						<li role="presentation" className="mx-3 my-1 border-t border-border-subtle" />
						<li role="presentation" className="px-3 pb-1 pt-1.5 text-caption text-primary-hover">
							{t("results.remarkKeyHeading")}
						</li>

						{REMARKS.map(([code, meaning], i) =>
							row(
								i + 2,
								// the codes line up in one column at the row's start, their meanings beside them
								<>
									<span dir="ltr" lang="en" className="w-9 shrink-0 font-en font-bold">
										{code}
									</span>
									<span dir="ltr" lang="en" className="truncate font-en text-foreground/80">
										{meaning}
									</span>
								</>,
							),
						)}
					</ul>,
					document.body,
				)}
		</>
	);
};

export default RemarkPicker;
