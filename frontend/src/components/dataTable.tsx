import type { ReactNode } from "react";

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
};

const DataTable = <T,>({ columns, rows, getRowId, emptyText }: DataTableProps<T>) => {
	return (
		<div className="overflow-x-auto rounded-lg border border-palette-2 bg-white">
			<table className="w-full text-palette-6">
				<thead className="bg-palette-6 text-palette-1">
					<tr>
						{columns.map((col) => (
							<th key={col.key} scope="col" className="whitespace-nowrap px-4 py-3 text-start font-semibold">
								{col.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-palette-2">
					{rows.length === 0 ? (
						<tr>
							<td colSpan={columns.length} className="px-4 py-6 text-center">
								{emptyText}
							</td>
						</tr>
					) : (
						rows.map((row) => (
							<tr key={getRowId(row)} className="hover:bg-palette-1">
								{columns.map((col) => (
									<td key={col.key} className="px-4 py-3">
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
