import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FormFieldProps = {
	id: string;
	label: string;
	// i18n key of the error message
	error?: string;
	children: ReactNode;
};

const FormField = ({ id, label, error, children }: FormFieldProps) => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="text-body-sm font-medium text-accent-deep">
				{label}
			</label>
			{children}
			{/* §39 — the message carries the meaning, not the colour alone */}
			{error && (
				<p className="text-body-sm text-error">{t(error)}</p>
			)}
		</div>
	);
};

export default FormField;
