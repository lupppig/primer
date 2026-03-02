import React from 'react';

interface PrimerLogoProps {
	size?: number;
	color?: string;
}

/**
 * The real Primer logo — a Lucide "layers" icon rendered as inline SVG.
 * Source: image/logo.svg
 */
export const PrimerLogo: React.FC<PrimerLogoProps> = ({ size = 40, color = '#3caff6' }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.1 6.27a2 2 0 0 0 0 3.46l9.07 4.09a2 2 0 0 0 1.66 0l9.07-4.09a2 2 0 0 0 0-3.46z" />
			<path d="m2.1 14.73 9.07 4.09a2 2 0 0 0 1.66 0l9.07-4.09" />
			<path d="m2.1 10.73 9.07 4.09a2 2 0 0 0 1.66 0l9.07-4.09" />
		</svg>
	);
};
