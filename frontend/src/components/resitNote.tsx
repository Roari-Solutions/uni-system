import { useTranslation } from "react-i18next";
import type { Resit } from "../types/grade";
import { resitSymbol } from "../utils/resultText";

/** A Sup & Sub re-exam mark, shown under the original it replaces in the GPA. */
const ResitNote = ({ resit }: { resit: Resit | null }) => {
	const { t } = useTranslation();
	if (!resit) return null;
	return (
		<span className="text-body-sm text-primary-hover">
			{t(`resit.kinds.${resit.kind}`)}{" "}
			<span dir="ltr" className="font-semibold">
				{resit.grade} {resit.letter}
				{resitSymbol(resit.kind)}
			</span>
		</span>
	);
};

export default ResitNote;
