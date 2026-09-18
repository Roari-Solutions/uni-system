import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ViewColumnsIcon } from "@heroicons/react/24/outline";

type ColumnToggleProps = {
	label: string;
	columns: { key: string; header: string }[];
	hidden: string[];
	onToggle: (key: string) => void;
};

const ColumnToggle = ({ label, columns, hidden, onToggle }: ColumnToggleProps) => {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// close when clicking outside or pressing Escape
	useEffect(() => {
		if (!open) return;

		const onMouseDown = (e: MouseEvent) => {
			if (!ref.current?.contains(e.target as Node)) setOpen(false);
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};

		document.addEventListener("mousedown", onMouseDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onMouseDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
				className="inline-flex h-12 items-center gap-2 rounded-sm border border-border bg-surface px-4 text-body-md text-foreground transition-colors duration-200 ease-out hover:bg-background"
			>
				<ViewColumnsIcon className="size-5" />
				{label}
				<ChevronDownIcon className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
			</button>

			{open && (
				<ul className="absolute end-0 z-10 mt-2 w-56 rounded-sm border border-border bg-surface py-2 text-foreground shadow-lg">
					{columns.map((col) => (
						<li key={col.key}>
							<label className="flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors duration-150 ease-out hover:bg-background">
								<input
									type="checkbox"
									checked={!hidden.includes(col.key)}
									onChange={() => onToggle(col.key)}
									className="size-4 accent-primary"
								/>
								{col.header}
							</label>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default ColumnToggle;
