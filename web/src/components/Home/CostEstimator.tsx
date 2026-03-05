import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface CostEstimatorProps {
	stressLevel: number; // 0 to 1
	chaosMode: boolean;
}

export const CostEstimator: React.FC<CostEstimatorProps> = ({ stressLevel, chaosMode }) => {
	// Base cost is around $1,250/mo. It scales up with stress.
	const [targetCost, setTargetCost] = useState(1250);

	useEffect(() => {
		let interval: any;
		if (chaosMode) {
			// Costs skyrocket unpredictably during chaos
			let increment = 1;
			interval = setInterval(() => {
				const r = (Math.sin(increment++) * 10000) - Math.floor(Math.sin(increment++) * 10000);
				setTargetCost(c => c + Math.abs(r) * 500);
			}, 100);
		} else {
			// Stable cost based on stress level
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setTargetCost(1250 + (stressLevel * 8500));
		}

		return () => clearInterval(interval);
	}, [stressLevel, chaosMode]);

	// Spring animation for smooth rolling odometer effect
	const springCost = useSpring(targetCost, { stiffness: 50, damping: 15 });

	// Format the number to currency
	const displayCost = useTransform(springCost, (latest) => {
		return latest.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
	});

	return (
		<div className="pointer-events-none">
			<motion.div
				className={`backdrop-blur-xl border rounded-2xl p-5 shadow-2xl transition-colors duration-500
                    ${chaosMode ? 'bg-red-500/10 border-red-500/50 shadow-red-500/20' : 'bg-white/10 dark:bg-black/40 border-slate-200 dark:border-white/10'}
                `}
				animate={chaosMode ? { x: [-2, 2, -2, 2, 0] } : {}}
				transition={{ duration: 0.2, repeat: Infinity }}
			>
				<div className={`text-xs font-bold uppercase tracking-widest mb-1 ${chaosMode ? 'text-red-500' : 'text-slate-500 dark:text-white/50'}`}>
					{chaosMode ? 'Projected Overages' : 'Est. Monthly Burn'}
				</div>

				<div className="flex items-baseline gap-1">
					<motion.span className={`text-4xl md:text-5xl font-mono font-black ${chaosMode ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
						{displayCost}
					</motion.span>
					<span className={`text-sm font-bold ${chaosMode ? 'text-red-400' : 'text-slate-400 dark:text-white/40'}`}>/mo</span>
				</div>

				<div className={`mt-3 h-1.5 w-full rounded-full overflow-hidden ${chaosMode ? 'bg-red-900/30' : 'bg-slate-200 dark:bg-white/10'}`}>
					<motion.div
						className={`h-full rounded-full ${chaosMode ? 'bg-red-500' : 'bg-[#0052FF] dark:bg-[#00C2FF]'}`}
						animate={{ width: `${Math.min(100, (targetCost / 10000) * 100)}%` }}
						transition={{ type: 'spring', bounce: 0 }}
					/>
				</div>
			</motion.div>
		</div>
	);
};
