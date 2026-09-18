export const inputClass = (invalid: boolean) =>
	`w-full rounded-md border bg-white px-3 py-2 text-palette-6 outline-none focus:ring-2 focus:ring-palette-4 ${
		invalid ? "border-red-600" : "border-palette-2"
	}`;

export const formCardClass = "flex flex-col gap-5 rounded-lg border border-palette-2 bg-white p-6";

export const submitButtonClass =
	"self-start rounded-md bg-palette-6 px-5 py-2 font-medium text-palette-1 hover:bg-palette-5";
