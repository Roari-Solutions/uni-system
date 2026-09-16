import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
	open: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel: string;
	onConfirm: () => void;
	onCancel: () => void;
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
			className="m-auto w-full max-w-md rounded-lg border border-palette-2 bg-white p-0 text-palette-6 backdrop:bg-black/50"
		>
			<div className="flex flex-col gap-4 p-6">
				<h2 className="text-lg font-semibold">{title}</h2>
				<p>{message}</p>

				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-md border border-palette-2 bg-white px-4 py-2 outline-none hover:bg-palette-1 focus:ring-2 focus:ring-palette-4"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="rounded-md bg-red-600 px-4 py-2 font-medium text-white outline-none hover:bg-red-700 focus:ring-2 focus:ring-palette-4"
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</dialog>
	);
};

export default ConfirmDialog;
