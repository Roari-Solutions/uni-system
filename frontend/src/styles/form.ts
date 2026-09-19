/**
 * Shared control styles. Values come from the design system tokens in
 * index.css — §17 buttons, §28 cards, §31 form inputs, §37 focus.
 */

// §31 — 44-48px tall, 8-12px radius, neutral border, primary focus ring
export const inputClass = (invalid: boolean) =>
	`h-12 w-full rounded-sm border bg-surface px-4 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 ${
		invalid ? "border-error" : "border-border"
	}`;

// §28 — standard card: surface, 12-16px radius, subtle border, soft shadow, 24px padding
export const cardClass =
	"rounded-md border border-border-subtle bg-surface p-6 shadow-md";

export const formCardClass = `flex flex-col gap-6 ${cardClass}`;

// §17.1 PRIMARY — the emphasis action. 44-48px tall, 20-24px padding, weight 600-700.
const buttonBase =
	"inline-flex h-12 items-center justify-center rounded-sm px-6 text-button transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60";

export const submitButtonClass = `self-start bg-primary text-foreground hover:bg-primary-hover hover:text-surface ${buttonBase}`;

// same button stretched, for a single centred card
export const blockSubmitButtonClass = `w-full bg-primary text-foreground hover:bg-primary-hover hover:text-surface ${buttonBase}`;

// §17.2 SECONDARY — transparent with an accent outline
export const secondaryButtonClass = `border border-border-accent bg-transparent text-primary-hover hover:bg-accent-soft/30 ${buttonBase}`;

// §17.3 DARK — deep institutional accent
export const darkButtonClass = `bg-accent-deep text-surface hover:bg-primary-hover ${buttonBase}`;

// §17.4 SMALL — 36px, for actions inside table rows
const smallButtonBase =
	"inline-flex h-9 items-center justify-center gap-2 rounded-sm px-4 text-body-sm font-semibold transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60";

export const smallPrimaryButtonClass = `bg-primary text-foreground hover:bg-primary-hover hover:text-surface ${smallButtonBase}`;

export const smallSecondaryButtonClass = `border border-border-accent bg-transparent text-primary-hover hover:bg-accent-soft/30 ${smallButtonBase}`;

// a destructive confirm; §4.2 permits a state colour as an explicit token
export const destructiveButtonClass = `bg-error text-surface hover:bg-error-hover ${buttonBase}`;
