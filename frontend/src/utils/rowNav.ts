/**
 * Keyboard movement between table rows. Rows opt in through DataTable's
 * `onRowActivate`; every row sharing a `navGroup` is one run, in page order,
 * even when it spans several tables.
 */

const groupRows = (group: string) =>
	Array.from(
		document.querySelectorAll<HTMLTableRowElement>(`tr[data-nav-group="${CSS.escape(group)}"]`),
	);

/** The id of the row `step` places away in the group, or null past either end. */
export const adjacentRowId = (group: string, rowId: string, step: 1 | -1): string | null => {
	const rows = groupRows(group);
	const index = rows.findIndex((row) => row.dataset.rowId === rowId);
	return index === -1 ? null : (rows[index + step]?.dataset.rowId ?? null);
};

/** Moves focus onto a row itself, from where the arrows and Enter take over. */
export const focusRow = (group: string, rowId: string) => {
	groupRows(group)
		.find((row) => row.dataset.rowId === rowId)
		?.focus();
};

/**
 * Focuses the first of these fields that is enabled, selecting a mark so typing
 * replaces it. False when none can take focus.
 */
export const focusField = (...ids: string[]): boolean => {
	for (const id of ids) {
		const field = document.getElementById(id);
		if (
			(field instanceof HTMLInputElement || field instanceof HTMLSelectElement) &&
			!field.disabled
		) {
			field.focus();
			if (field instanceof HTMLInputElement) field.select();
			return true;
		}
	}
	return false;
};

/** Runs after React has committed the render the caller just asked for. */
export const afterRender = (fn: () => void) => requestAnimationFrame(fn);
