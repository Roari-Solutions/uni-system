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
			className="rounded-xs p-2 text-foreground transition-colors duration-150 ease-out hover:bg-background hover:text-error"
		>
			<TrashIcon className="size-5" />
		</button>
	);
};

export default DeleteButton;
