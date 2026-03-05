/* eslint-disable react-refresh/only-export-components */
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../utils/helpers';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
	'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
				destructive: 'bg-[var(--color-danger)] text-white hover:bg-red-600',
				outline: 'border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-panel)] text-white',
				secondary: 'bg-[var(--color-panel)] text-white hover:bg-[#2d3139]',
				ghost: 'hover:bg-[var(--color-panel)] hover:text-white text-[var(--color-text-muted)]',
				link: 'text-[var(--color-primary)] underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-md px-8',
				icon: 'h-10 w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
	VariantProps<typeof buttonVariants> {
	isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, isLoading, children, ...props }, ref) => {
		return (
			<button
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				disabled={isLoading || props.disabled}
				{...props}
			>
				{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
				{children}
			</button>
		);
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants };
