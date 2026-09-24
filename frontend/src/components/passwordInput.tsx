import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { inputClass } from "../styles/form";

type PasswordInputProps = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	autoComplete: string;
	invalid?: boolean;
	describedBy?: string;
	// set on the wrapper, so the eye sits at the end of the text's own direction
	dir?: "ltr" | "rtl";
};

/** A password field with an eye button that shows or hides what was typed. */
const PasswordInput = ({
	id,
	value,
	onChange,
	autoComplete,
	invalid = false,
	describedBy,
	dir,
}: PasswordInputProps) => {
	const { t } = useTranslation();
	const [visible, setVisible] = useState(false);
	const Icon = visible ? EyeSlashIcon : EyeIcon;

	return (
		<div dir={dir} className="relative">
			<input
				id={id}
				type={visible ? "text" : "password"}
				autoComplete={autoComplete}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-invalid={invalid}
				aria-describedby={describedBy}
				// room at the end for the eye button
				className={`${inputClass(invalid)} pe-12`}
			/>
			{/* §36 link colours; §37 focus ring; §39 the label says what the button does */}
			<button
				type="button"
				onClick={() => setVisible((prev) => !prev)}
				aria-label={t(visible ? "common.hidePassword" : "common.showPassword")}
				aria-pressed={visible}
				aria-controls={id}
				title={t(visible ? "common.hidePassword" : "common.showPassword")}
				className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-sm text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
			>
				<Icon className="size-5" aria-hidden />
			</button>
		</div>
	);
};

export default PasswordInput;
