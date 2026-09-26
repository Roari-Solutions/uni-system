import { useEffect, useRef } from "react";
import { destructiveButtonClass, secondaryButtonClass, submitButtonClass } from "../styles/form";

type ConfirmDialogProps = {
	open: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel: string;
	onConfirm: () => void;
	onCancel: () => void;
	/** A delete confirms in the error colour; anything else in the primary one. */
	tone?: "destructive" | "primary";
};

// native <dialog> gives focus trapping, Escape to close and a backdrop for free
const ConfirmDialog = ({
	open,
	title,
	message,
	confirmLabel,
	cancelLabel,
	onConfirm,
	onCancel,
	tone = "destructive",
}: ConfirmDialogProps) => {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;

		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			// fires on Escape as well as on close()
			onClose={onCancel}
			// a click on the dialog element itself (not its content) is a click on the backdrop
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			className="m-auto w-full max-w-md rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60"
		>
			<div className="flex flex-col gap-6 p-6">
				<h2 className="text-heading-5 text-accent-deep">{title}</h2>
				<p className="text-body-md">{message}</p>

				<div className="flex justify-end gap-3">
					<button type="button" onClick={onCancel} className={secondaryButtonClass}>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className={tone === "primary" ? submitButtonClass : destructiveButtonClass}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</dialog>
	);
};

export default ConfirmDialog;
