import { useEffect, useMemo, useState } from "react";
import { fetchFaculties } from "../api/faculties";
import useAuth from "../auth/useAuth";
import type { Faculty } from "../types/faculty";

export type UseFacultiesResult = {
	faculties: Faculty[];
	loading: boolean;
	failed: boolean;
	/** True when the caller may not choose a faculty: it is fixed to their own. */
	locked: boolean;
	/** The faculty a locked caller is bound to, else null. */
	lockedFacultyId: string | null;
	/** That faculty's row, once it has loaded. */
	lockedFaculty: Faculty | null;
};

/**
 * Faculty options for every faculty select in the dashboard.
 *
 * An admin gets the full list and may pick any of them. A data-entry employee
 * is scoped server-side to one faculty, so the list comes back with exactly
 * that faculty and `locked` tells the views to fix the value rather than offer
 * a choice. The lock is a UI affordance; the API enforces the same rule.
 */
const useFaculties = (): UseFacultiesResult => {
	const { status, facultyLocked, facultyId } = useAuth();
	const [faculties, setFaculties] = useState<Faculty[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (status !== "authed") return;

		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchFaculties()
			.then((rows) => {
				if (cancelled) return;
				setFaculties(rows);
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [status]);

	const lockedFacultyId = facultyLocked ? facultyId : null;

	const lockedFaculty = useMemo(
		() => (lockedFacultyId ? (faculties.find((f) => f.id === lockedFacultyId) ?? null) : null),
		[faculties, lockedFacultyId],
	);

	return {
		faculties,
		loading,
		failed,
		locked: facultyLocked,
		lockedFacultyId,
		lockedFaculty,
	};
};

export default useFaculties;
