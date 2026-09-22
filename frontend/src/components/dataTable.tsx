import type { MouseEvent, ReactNode } from "react";

export type Column<T> = {
	key: string;
	header: string;
	render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
	columns: Column<T>[];
	rows: T[];
	getRowId: (row: T) => string;
	emptyText: string;
	// makes the whole row a pointer target; keyboard users need a link inside the row too
	onRowClick?: (row: T) => void;
};

const DataTable = <T,>({ columns, rows, getRowId, emptyText, onRowClick }: DataTableProps<T>) => {
	const handleRowClick = (e: MouseEvent<HTMLTableRowElement>, row: T) => {
		// controls inside the row keep their own behaviour
		if ((e.target as HTMLElement).closest("a, button, input, select, textarea")) return;
		onRowClick?.(row);
	};

	return (
		<div className="overflow-x-auto rounded-md border border-border-subtle bg-surface shadow-md">
			<table className="w-full text-body-md text-foreground">
				<thead className="bg-accent-deep text-surface">
					<tr>
						{columns.map((col) => (
							// headers may wrap, so the table fits its container instead of scrolling
							<th key={col.key} scope="col" className="px-4 py-4 text-start align-bottom text-body-sm font-semibold">
								{col.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border-subtle">
					{rows.length === 0 ? (
						<tr>
							<td colSpan={columns.length} className="px-4 py-8 text-center">
								{emptyText}
							</td>
						</tr>
					) : (
						rows.map((row) => (
							<tr
								key={getRowId(row)}
								onClick={onRowClick ? (e) => handleRowClick(e, row) : undefined}
								className={`transition-colors duration-150 ease-out hover:bg-background ${onRowClick ? "cursor-pointer" : ""}`}
							>
								{columns.map((col) => (
									<td key={col.key} className="px-4 py-4">
										{col.render(row)}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};

export default DataTable;
