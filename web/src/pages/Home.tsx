import { motion } from 'framer-motion';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Common/Button';
import { ArrowRight, Github, Zap, BarChart3, ShieldAlert, MousePointerClick, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '../components/Common/ThemeToggle';
import { useAuthStore } from '../store/useAuthStore';
import { ReactLenis } from 'lenis/react';
import { HeroCanvas } from '../components/Canvas3D/HeroCanvas';
import { CostEstimator } from '../components/Home/CostEstimator';

// Theme hook
const useCurrentTheme = () => {
	const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
	React.useEffect(() => {
		const check = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
		check();
		const obs = new MutationObserver(check);
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => obs.disconnect();
	}, []);
	return theme;
};

// Primer Logo
const Logo = ({ className }: { className?: string }) => (
	<svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M14 2L26 9V19L14 26L2 19V9L14 2Z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.06" />
		<path d="M14 2V26" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
		<path d="M2 9L14 16L26 9" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4" />
		<circle cx="14" cy="14" r="2.5" fill="currentColor" fillOpacity="0.8" />
		<circle cx="14" cy="14" r="1" fill="currentColor" />
	</svg>
);

// Animated counter for stats
const Counter = ({ value, suffix = '' }: { value: string; suffix?: string }) => (
	<span className="tabular-nums">{value}<span className="text-slate-400 dark:text-white/30">{suffix}</span></span>
);

// Feature block
const Feature = ({ idx, title, desc, icon: Icon }: { idx: string; title: string; desc: string; icon: any }) => (
	<motion.div
		initial={{ opacity: 0, y: 40 }}
		whileInView={{ opacity: 1, y: 0 }}
		viewport={{ once: true, margin: "-80px" }}
		transition={{ duration: 0.7, delay: Number(idx) * 0.08 }}
		className="group relative"
	>
		<div className="absolute -left-px top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent dark:via-white/10 group-hover:via-blue-500 dark:group-hover:via-cyan-400 transition-all duration-500" />
		<div className="pl-8 py-6">
			<div className="flex items-center gap-3 mb-4">
				<div className="w-10 h-10 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-white/40 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-hover:border-blue-200 dark:group-hover:border-cyan-400/30 transition-all duration-300 bg-white dark:bg-white/5">
					<Icon className="w-5 h-5" strokeWidth={1.5} />
				</div>
				<span className="text-[11px] font-mono text-slate-300 dark:text-white/20 tracking-widest">{idx}</span>
			</div>
			<h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{title}</h3>
			<p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">{desc}</p>
		</div>
	</motion.div>
);

export default function Home() {
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user);
	const theme = useCurrentTheme();
	const [chaosMode, setChaosMode] = React.useState(false);
	const [stressLevel, setStressLevel] = React.useState(0);

	React.useEffect(() => {
		if (!chaosMode) return;
		const id = setInterval(() => {
			const t = performance.now();
			document.body.style.transform = `translate(${Math.sin(t) * 3}px, ${Math.cos(t) * 3}px)`;
			setTimeout(() => { document.body.style.transform = ''; }, 50);
		}, 300);
		return () => { clearInterval(id); document.body.style.transform = ''; };
	}, [chaosMode]);

	return (
		<ReactLenis root>
			<div className="min-h-screen font-sans antialiased transition-colors duration-500 bg-white text-slate-900 dark:bg-[#09090b] dark:text-white">

				{/* ━━━ Nav ━━━ */}
				<header className="fixed top-0 inset-x-0 z-50 backdrop-blur-2xl border-b border-slate-100 dark:border-white/[0.04] bg-white/80 dark:bg-[#09090b]/80">
					<div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
						<div className="flex items-center gap-2.5">
							<Logo className="w-7 h-7 text-slate-900 dark:text-white" />
							<span className="text-[15px] font-semibold tracking-tight">Primer</span>
						</div>
						<nav className="hidden md:flex items-center gap-8 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
							<a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
							<a href="#about" className="hover:text-slate-900 dark:hover:text-white transition-colors">About</a>
							<a href="https://github.com/lupppig/primer" target="_blank" rel="noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">GitHub</a>
						</nav>
						<div className="flex items-center gap-3">
							<ThemeToggle />
							<Button
								onClick={() => navigate(user ? '/dashboard' : '/login')}
								className="h-9 px-5 rounded-lg text-[13px] font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 transition-all shadow-sm"
							>
								{user ? 'Open Canvas' : 'Get Started'}
							</Button>
						</div>
					</div>
				</header>

				{/* ━━━ Hero ━━━ */}
				<section className="relative min-h-screen pt-16 overflow-hidden">
					<div className="mx-auto px-6 lg:px-12 max-w-[1440px] min-h-[calc(100vh-4rem)] grid lg:grid-cols-[minmax(380px,480px)_1fr] gap-10 lg:gap-12 items-center">

						{/* Left: Text */}
						<div className="relative z-10 py-24 lg:py-0">
							<motion.div
								initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
							>
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-8 tracking-wide">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
									Now in public beta
								</div>
							</motion.div>

							<motion.h1
								initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 1, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
								className="text-[2.5rem] md:text-[3.2rem] font-semibold tracking-[-0.035em] leading-[1.1] mb-8"
							>
								Architecture at the{' '}
								<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-300 dark:to-blue-400">
									speed of sight
								</span>
							</motion.h1>

							<motion.p
								initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 1, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
								className="text-[15px] text-slate-600 dark:text-slate-400 leading-[1.8] mb-12"
							>
								The flight simulator for backend infrastructure. Build high-scale systems,
								inject massive traffic, and trigger chaos—all before writing a single line of production code.
							</motion.p>

							<motion.div
								initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
								className="flex flex-wrap items-center gap-3 mb-8"
							>
								<button
									onClick={() => navigate(user ? '/dashboard' : '/login')}
									className="h-11 px-6 rounded-lg flex items-center gap-2 text-[13px] font-medium transition-all bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 shadow-lg shadow-slate-900/10 dark:shadow-white/10"
								>
									Launch Simulation <ArrowRight className="w-3.5 h-3.5" />
								</button>
								<button
									onClick={() => window.open('https://github.com/lupppig/primer', '_blank')}
									className="h-11 px-6 rounded-lg flex items-center gap-2 text-[13px] font-medium transition-all border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
								>
									<Github className="w-3.5 h-3.5" /> Source Code
								</button>
							</motion.div>

							{/* Mode Switcher */}
							<motion.div
								initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
								className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] w-fit"
							>
								{[
									{ label: 'Idle', active: stressLevel === 0 && !chaosMode, onClick: () => { setStressLevel(0); setChaosMode(false); }, color: 'bg-slate-900 dark:bg-white text-white dark:text-black' },
									{ label: 'Stress', active: stressLevel > 0 && !chaosMode, onClick: () => { setStressLevel(1); setChaosMode(false); }, color: 'bg-amber-500 text-white' },
									{ label: 'Chaos', active: chaosMode, onClick: () => setChaosMode(true), color: 'bg-red-600 text-white', icon: ShieldAlert },
								].map((btn) => (
									<button
										key={btn.label}
										onClick={btn.onClick}
										className={`h-8 px-4 rounded-md text-[12px] font-semibold transition-all flex items-center gap-1.5 ${btn.active ? `${btn.color} shadow-sm` : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
									>
										{btn.icon && <btn.icon className="w-3 h-3" />}
										{btn.label}
									</button>
								))}
							</motion.div>
						</div>

						{/* Right: 3D Canvas — contained in its own column */}
						<div className="relative lg:h-[calc(100vh-8rem)] h-[60vh] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-[#111113] shadow-sm dark:shadow-none my-8 lg:my-8">
							{/* Chaos overlay */}
							{chaosMode && (
								<div className="absolute inset-0 z-10 pointer-events-none rounded-2xl">
									<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(220,38,38,0.2)_100%)]" />
								</div>
							)}
							<HeroCanvas chaosMode={chaosMode} stressLevel={stressLevel} theme={theme} />

							{/* Cost Estimator anchored to the canvas */}
							<div className="absolute bottom-4 left-4 z-20">
								<CostEstimator stressLevel={stressLevel} chaosMode={chaosMode} />
							</div>
						</div>

					</div>
				</section>

				{/* ━━━ Stats Bar ━━━ */}
				<section className="relative z-20 border-y border-slate-100 dark:border-white/[0.04] bg-slate-50/80 dark:bg-white/[0.02] backdrop-blur-lg">
					<div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
						{[
							{ stat: '1M+', label: 'Simulated RPS' },
							{ stat: '< 12ms', label: 'P99 Latency Target' },
							{ stat: '24', label: 'Cloud Components' },
							{ stat: '99.99%', label: 'Uptime Validated' },
						].map((item, i) => (
							<motion.div
								key={i}
								initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }} transition={{ delay: i * 0.08 }}
								className="text-center"
							>
								<div className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">
									<Counter value={item.stat} />
								</div>
								<div className="text-[12px] text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">{item.label}</div>
							</motion.div>
						))}
					</div>
				</section>

				{/* ━━━ Problem/Solution ━━━ */}
				<section id="about" className="relative z-20 py-28 px-6 bg-white dark:bg-[#09090b]">
					<div className="max-w-3xl mx-auto">
						<motion.div
							initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }} transition={{ duration: 0.8 }}
							className="text-center"
						>
							<p className="text-[12px] font-semibold tracking-[0.2em] uppercase text-blue-600 dark:text-cyan-400 mb-6">The Problem</p>
							<h2 className="text-3xl md:text-[2.8rem] font-semibold tracking-[-0.03em] leading-[1.15] mb-8">
								Stop guessing.{' '}
								<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-300 dark:to-blue-400">
									Start stress-testing.
								</span>
							</h2>
							<p className="text-[16px] text-slate-500 dark:text-slate-400 leading-[1.8] mx-auto max-w-xl mb-4">
								In the old world, you deployed to production and hoped your database wouldn't crash during a traffic spike.
								In the Primer world, you've already seen it happen.
							</p>
							<p className="text-[15px] text-slate-400 dark:text-slate-500 leading-[1.8] mx-auto max-w-xl">
								Drag components, connect them with high-speed data streams, and watch your infrastructure breathe.
								Primer bridges the gap between system design and performance telemetry.
							</p>
						</motion.div>
					</div>
				</section>

				{/* ━━━ Features ━━━ */}
				<section id="features" className="relative z-20 py-28 px-6 bg-slate-50/50 dark:bg-[#0c0c0e] border-y border-slate-100 dark:border-white/[0.04]">
					<div className="max-w-5xl mx-auto">
						<motion.div
							initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }} transition={{ duration: 0.8 }}
							className="mb-16"
						>
							<p className="text-[12px] font-semibold tracking-[0.2em] uppercase text-blue-600 dark:text-cyan-400 mb-4">Capabilities</p>
							<h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em]">Engineering excellence,<br />built in.</h2>
						</motion.div>

						<div className="grid md:grid-cols-2 gap-x-16 gap-y-2">
							<Feature idx="01" icon={MousePointerClick} title="Spatial Architecture Canvas"
								desc="Design in a high-fidelity, interactive WebGL environment. Drag-and-drop Load Balancers, API Gateways, and Worker Clusters with mechanical precision." />
							<Feature idx="02" icon={Zap} title="Real-Time Traffic Injection"
								desc="Push your system from 10 to 1,000,000 RPS and watch the Kinetic Flow of data stream through your architecture. Find your bottleneck before your customers do." />
							<Feature idx="03" icon={ShieldAlert} title="Weaponized Chaos Engineering"
								desc="Introduce server failures, network jitter, and database lag with one click. If your system survives the Primer Chaos Protocol, it can survive anything." />
							<Feature idx="04" icon={BarChart3} title="Predictive Cloud Economics"
								desc="Our Burn Rate Engine calculates monthly AWS/GCP/Azure costs in real-time based on simulated traffic density and resource allocation. No more surprise bills." />
						</div>
					</div>
				</section>

				{/* ━━━ Technical Details ━━━ */}
				<section className="relative z-20 py-28 px-6 bg-white dark:bg-[#09090b]">
					<div className="max-w-5xl mx-auto">
						<motion.div
							initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }} transition={{ duration: 0.8 }}
							className="mb-16"
						>
							<p className="text-[12px] font-semibold tracking-[0.2em] uppercase text-blue-600 dark:text-cyan-400 mb-4">Under The Hood</p>
							<h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] mb-4">
								Built for the modern engineer.
							</h2>
							<p className="text-[16px] text-slate-500 dark:text-slate-400 leading-[1.7] max-w-lg">
								React Three Fiber. GSAP. React Flow. A frictionless interface that feels as fast as your thoughts.
							</p>
						</motion.div>

						<div className="grid md:grid-cols-3 gap-8">
							{[
								{ title: 'Mechanical Telemetry', desc: 'Click any node to unfold its internal stats with precision spring animations and real-time metric overlays.' },
								{ title: 'Responsive Feedback', desc: 'Feel your system\'s load through animated UI ripples, pulsing nodes, and dynamic particle acceleration.' },
								{ title: 'Export Anywhere', desc: 'Take your architecture to the boardroom. One-click export to SVG, PNG, or animated recordings.' },
							].map((item, i) => (
								<motion.div
									key={i}
									initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}
									className="p-6 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-200 dark:hover:border-white/10 transition-colors"
								>
									<h3 className="font-semibold text-[15px] mb-2.5 text-slate-900 dark:text-white">{item.title}</h3>
									<p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">{item.desc}</p>
								</motion.div>
							))}
						</div>
					</div>
				</section>

				{/* ━━━ CTA ━━━ */}
				<section className="relative z-20 py-28 px-6 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-[#0c0c0e] overflow-hidden">
					<div className="max-w-2xl mx-auto text-center relative z-10">
						<motion.div
							initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }} transition={{ duration: 0.8 }}
						>
							<h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] mb-4">
								Ready to build for resilience?
							</h2>
							<p className="text-[16px] text-slate-500 dark:text-slate-400 mb-10">
								Join the engineers who design with certainty.
							</p>
							<button
								onClick={() => navigate(user ? '/dashboard' : '/login')}
								className="h-12 px-8 rounded-lg text-[14px] font-medium transition-all bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 shadow-xl shadow-slate-900/10 dark:shadow-white/5 inline-flex items-center gap-2"
							>
								Get started — it's free <ChevronRight className="w-4 h-4" />
							</button>
						</motion.div>
					</div>

					{/* Ambient */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/[0.04] dark:bg-cyan-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
				</section>

				{/* ━━━ Footer ━━━ */}
				<footer className="relative z-20 border-t border-slate-100 dark:border-white/[0.04] bg-white dark:bg-[#09090b]">
					<div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
						<div className="flex items-center gap-2 text-[13px] text-slate-400 dark:text-slate-600">
							<Logo className="w-4 h-4" />
							<span>© 2025 Primer</span>
						</div>
						<div className="flex items-center gap-6 text-[12px] text-slate-400 dark:text-slate-600 font-medium">
							<a href="https://github.com/lupppig/primer" target="_blank" rel="noreferrer" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors">GitHub</a>
						</div>
					</div>
				</footer>
			</div>
		</ReactLenis>
	);
}
