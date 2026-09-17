import { TrashIcon } from "@heroicons/react/24/outline";

type DeleteButtonProps = {
	label: string;
	onClick: () => void;
};

const DeleteButton = ({ label, onClick }: DeleteButtonProps) => {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={label}
			className="rounded-md p-1.5 text-palette-6 outline-none hover:bg-palette-1 hover:text-red-600 focus:ring-2 focus:ring-palette-4"
		>
			<TrashIcon className="size-5" />
		</button>
	);
};

export default DeleteButton;
