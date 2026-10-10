/**
 * Language switch icon: an Arabic letter (ع) and a Latin letter (A), each in
 * its own rounded square. Takes its colour from the surrounding text colour.
 */
const LanguageToggleIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		className={className}
		aria-hidden="true"
	>
		<rect x="1.5" y="2.5" width="10.5" height="10.5" rx="2.5" />
		<rect x="12" y="11" width="10.5" height="10.5" rx="2.5" />
		<text
			x="6.75"
			y="10.4"
			textAnchor="middle"
			fontSize="9"
			fontWeight="700"
			fill="currentColor"
			stroke="none"
			fontFamily="Tajawal, Cairo, sans-serif"
		>
			ع
		</text>
		<text
			x="17.25"
			y="19.1"
			textAnchor="middle"
			fontSize="9"
			fontWeight="700"
			fill="currentColor"
			stroke="none"
			fontFamily="Inter, Poppins, sans-serif"
		>
			A
		</text>
	</svg>
);

export default LanguageToggleIcon;
