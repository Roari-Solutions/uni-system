/**
 * The tilted corner squares from the login page, drawn behind a page.
 * Anchored to the screen's end-side top corner (top-left in Arabic), opposite
 * the side menu. Place it inside an `isolate` container.
 */
const PageBackdrop = () => (
	<div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div className="absolute -end-44 -top-44 size-[360px] rotate-[20deg] rounded-lg bg-gradient-to-br from-accent-deep/20 to-primary-hover/10" />
		<div className="absolute -end-16 -top-16 size-48 rotate-[20deg] rounded-lg border-2 border-accent-deep/25" />
	</div>
);

export default PageBackdrop;
