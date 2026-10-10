/**
 * Shared control styles. Colours come from the design system tokens in
 * index.css (card, accent, accent-dark, footer, destructive, secondary, ring).
 */

// 48px tall, 8px radius, neutral border, gold focus ring
export const inputClass = (invalid: boolean) =>
	`h-12 w-full rounded-sm border bg-card px-4 text-body-md text-foreground outline-none focus:border-accent focus:ring-3 focus:ring-ring/25 ${
		invalid ? "border-destructive" : "border-secondary"
	}`;

// standard card: card surface, 12px radius, soft border and shadow, 24px padding
export const cardClass = "rounded-md border border-border bg-card p-6 shadow-md";

export const formCardClass = `flex flex-col gap-6 ${cardClass}`;

// PRIMARY — the emphasis action. 48px tall, 24px padding, weight 600.
const buttonBase =
	"inline-flex h-12 items-center justify-center rounded-sm px-6 text-button transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60";

export const submitButtonClass = `self-start bg-accent text-accent-foreground hover:bg-accent-dark hover:text-primary-foreground ${buttonBase}`;

// same button stretched, for a single centred card
export const blockSubmitButtonClass = `w-full bg-accent text-accent-foreground hover:bg-accent-dark hover:text-primary-foreground ${buttonBase}`;

// SECONDARY — transparent with an accent outline
export const secondaryButtonClass = `border border-accent-dark bg-transparent text-accent-dark hover:bg-quote/30 ${buttonBase}`;

// DARK — deep institutional brown
export const darkButtonClass = `bg-footer text-footer-foreground hover:bg-accent-dark ${buttonBase}`;

// SMALL — 36px, for actions inside table rows
const smallButtonBase =
	"inline-flex h-9 items-center justify-center gap-2 rounded-sm px-4 text-body-sm font-semibold transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60";

export const smallPrimaryButtonClass = `bg-accent text-accent-foreground hover:bg-accent-dark hover:text-primary-foreground ${smallButtonBase}`;

export const smallSecondaryButtonClass = `border border-accent-dark bg-transparent text-accent-dark hover:bg-quote/30 ${smallButtonBase}`;

// a destructive confirm; a state colour is permitted as an explicit token
export const destructiveButtonClass = `bg-destructive text-destructive-foreground hover:bg-destructive/90 ${buttonBase}`;
