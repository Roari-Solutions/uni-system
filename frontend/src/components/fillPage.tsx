import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Makes a page exactly as tall as the room left on screen: from where it starts
 * down to the bottom margin. It measures the screen itself, so it fills the page
 * whatever the surrounding layout does. `enabled={false}` fills its parent instead.
 */
const FillPage = ({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) => {
	const ref = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | undefined>();

	useLayoutEffect(() => {
		const el = ref.current;
		if (!enabled || !el) return;
		const measure = () => {
			const top = el.getBoundingClientRect().top;
			// keep the page margin the layout already has below the content (at least 16px)
			const parent = el.parentElement;
			const margin = parent ? parseFloat(getComputedStyle(parent).paddingBottom) || 0 : 0;
			setHeight(Math.max(320, window.innerHeight - top - Math.max(margin, 16)));
		};
		measure();
		window.addEventListener("resize", measure);
		void document.fonts?.ready.then(measure);
		return () => window.removeEventListener("resize", measure);
	}, [enabled]);

	// not a page of its own (e.g. inside a tab): take whatever room the parent gives
	if (!enabled) return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
	return (
		<div ref={ref} style={{ height }} className="relative isolate flex min-h-0 w-full flex-col">
			{children}
		</div>
	);
};

export default FillPage;
