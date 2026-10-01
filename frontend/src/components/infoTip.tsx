import { useId } from "react";
import { useTranslation } from "react-i18next";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type InfoTipProps = {
	/** Already translated: the tip reads in the dashboard's language. */
	text: string;
};

/**
 * An info icon whose tip shows on hover and on keyboard focus (§36: hover is
 * never the only way in). Screen readers hear it as the button's description.
 * It keeps the dashboard's language and direction even inside an English block.
 */
const InfoTip = ({ text }: InfoTipProps) => {
	const { t, i18n } = useTranslation();
	const id = useId();
	const ar = i18n.language === "ar";

	return (
		<span className="group relative inline-flex">
			<button
				type="button"
				aria-label={t("common.moreInfo")}
				aria-describedby={id}
				className="inline-flex size-9 items-center justify-center rounded-full text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep"
			>
				<InformationCircleIcon className="size-5" aria-hidden />
			</button>
			<span
				id={id}
				role="tooltip"
				dir={i18n.dir()}
				lang={i18n.language}
				className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-sm bg-foreground px-3 py-2 text-start text-body-sm font-normal normal-case tracking-normal text-surface opacity-0 shadow-lg transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100 ${
					ar ? "font-ar" : "font-en"
				}`}
			>
				{text}
			</span>
		</span>
	);
};

export default InfoTip;
