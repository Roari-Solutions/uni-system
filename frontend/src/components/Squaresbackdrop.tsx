// Full literal class strings, so Tailwind can see every one of them.
const SHAPES = [
	// one side of the form
	"right-[6%] top-[10%] size-24 rotate-[18deg] bg-accent/30",
	"right-[15%] top-[42%] size-40 rotate-[-12deg] border-2 border-accent/45",
	"right-[3%] bottom-[9%] size-32 rotate-[24deg] bg-gradient-to-br from-accent/35 to-muted-foreground/10",
	"right-[20%] bottom-[30%] size-12 rotate-[40deg] bg-muted-foreground/15",
	"right-[28%] top-[6%] size-16 rotate-[-30deg] border-2 border-muted-foreground/25",
	// the other side
	"left-[5%] top-[18%] size-36 rotate-[-20deg] bg-gradient-to-br from-accent/35 to-muted-foreground/10",
	"left-[17%] top-[7%] size-14 rotate-[30deg] border-2 border-muted-foreground/25",
	"left-[8%] top-[54%] size-24 rotate-[14deg] bg-accent/30",
	"left-[18%] bottom-[10%] size-44 rotate-[-28deg] border-2 border-accent/45",
	"left-[2%] bottom-[36%] size-12 rotate-[45deg] bg-muted-foreground/15",
	"left-[26%] bottom-[34%] size-16 rotate-[12deg] bg-accent/20",
];

/**
 * A scatter of tilted gold squares, filling the space on both sides of a
 * narrow page. Place it inside an `isolate` container (FillPage already is).
 */
const SquaresBackdrop = () => (
	<div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		{SHAPES.map((shape) => (
			<div key={shape} className={`absolute rounded-lg ${shape}`} />
		))}
	</div>
);

export default SquaresBackdrop;
