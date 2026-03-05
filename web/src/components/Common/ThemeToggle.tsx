import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggle() {
	const { theme, setTheme } = useThemeStore();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true);
	}, []);

	if (!mounted) {
		return <div className="w-9 h-9" />;
	}

	const isDark = theme === 'dark';

	const toggleTheme = () => {
		setTheme(isDark ? 'light' : 'dark');
	};

	return (
		<button
			onClick={toggleTheme}
			className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-panel)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
			aria-label="Toggle theme"
			title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
		>
			<AnimatePresence mode="wait" initial={false}>
				<motion.div
					key={isDark ? 'dark' : 'light'}
					initial={{ y: -20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 20, opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="absolute"
				>
					{isDark
						? <Moon className="w-5 h-5 text-[var(--color-primary)]" />
						: <Sun className="w-5 h-5 text-orange-500" />
					}
				</motion.div>
			</AnimatePresence>
		</button>
	);
}
