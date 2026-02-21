import { motion } from 'framer-motion';
import { Box, Home, FolderOpen, Users, LayoutTemplate, Settings, Plus, ArrowRight, LogOut, Trash2 } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/Common/Card';
import { MOCK_TEMPLATES } from '../utils/mockData';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useDesignStore } from '../store/useDesignStore';

export default function Dashboard() {
	const navigate = useNavigate();
	const { user, logout } = useAuthStore();
	const { designs, fetchDesigns, createDesign, deleteDesign, isLoading } = useDesignStore();

	useEffect(() => {
		if (!user) {
			navigate('/');
			return;
		}
		// Load actual designs from the DB
		fetchDesigns();
	}, [user, navigate, fetchDesigns]);

	const handleCreateDesign = async () => {
		try {
			// Creates a blank design in the DB
			const newId = await createDesign('Untitled Architecture', 'A new system design');
			navigate(`/canvas?id=${newId}`);
		} catch (e) {
			console.error("Failed to create design", e);
		}
	};

	return (
		<div className="flex h-screen bg-[var(--color-canvas)]">
			{/* Sidebar */}
			<aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-panel)] flex flex-col">
				<div className="p-6 flex items-center gap-2">
					<Box className="w-6 h-6 text-[var(--color-primary)]" />
					<h2 className="text-xl font-heading font-bold text-white tracking-tight">Primer</h2>
				</div>

				<nav className="flex-1 px-4 space-y-1">
					<a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
						<Home className="w-4 h-4" />
						Home
					</a>
					<a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors">
						<FolderOpen className="w-4 h-4" />
						My Designs
					</a>
					<a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors">
						<Users className="w-4 h-4" />
						Shared
					</a>
					<a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors">
						<LayoutTemplate className="w-4 h-4" />
						Templates
					</a>

					<div className="pt-8 pb-2">
						<p className="px-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
							Workspace
						</p>
					</div>
					<a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors">
						<div className="w-2 h-2 rounded-full bg-blue-500" />
						Backend Arch
					</a>
					<a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors">
						<div className="w-2 h-2 rounded-full bg-emerald-500" />
						Frontend Systems
					</a>
				</nav>

				<div className="p-4 border-t border-[var(--color-border)] flex flex-col gap-2">
					<a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors">
						<Settings className="w-4 h-4" />
						Settings
					</a>
					<button
						onClick={() => logout()}
						className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors w-full text-left"
					>
						<LogOut className="w-4 h-4" />
						Log Out
					</button>
				</div>
			</aside>

			{/* Main Content */}
			<main className="flex-1 overflow-y-auto">
				<div className="max-w-7xl mx-auto p-8 space-y-8">
					<div className="flex justify-between items-center">
						<div>
							<h1 className="text-3xl font-heading font-bold text-white tracking-tight">Welcome back, {user?.username || 'Architect'}</h1>
							<p className="text-[var(--color-text-muted)] mt-1">Pick up where you left off or start a new system design.</p>
						</div>
						<Button onClick={handleCreateDesign} className="gap-2 group overflow-hidden relative" isLoading={isLoading}>
							<motion.div
								className="absolute inset-0 bg-white/20"
								initial={{ x: '-100%' }}
								whileHover={{ x: '100%' }}
								transition={{ duration: 0.5, ease: 'easeInOut' }}
							/>
							<Plus className="w-4 h-4" />
							Create New Design
						</Button>
					</div>

					<section>
						<div className="flex justify-between items-end mb-4">
							<h2 className="text-xl font-semibold text-white">Recent Designs</h2>
							<a href="#" className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
								View all <ArrowRight className="w-4 h-4" />
							</a>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{designs.length === 0 && !isLoading ? (
								<p className="text-sm text-[var(--color-text-muted)]">No designs found. Create one to get started!</p>
							) : (
								designs.map((design, i) => (
									<motion.div
										key={design.id}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.3, delay: i * 0.1 }}
										whileHover={{ y: -4, transition: { duration: 0.2 } }}
										onClick={() => navigate(`/canvas?id=${design.id}`)}
									>
										<Card className="overflow-hidden cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors group relative">
											<div
												className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
												onClick={(e) => {
													e.stopPropagation();
													if (confirm('Are you sure you want to delete this design?')) {
														deleteDesign(design.id);
													}
												}}
											>
												<Button variant="ghost" size="icon" className="h-8 w-8 bg-black/40 hover:bg-red-500 hover:text-white backdrop-blur-sm text-white/70">
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
											<div className="h-32 bg-[#2d3139] relative overflow-hidden flex items-center justify-center">
												<LayoutTemplate className="w-8 h-8 text-[var(--color-text-muted)]/50 group-hover:scale-110 transition-transform duration-500" />
												<div className="absolute inset-0 bg-gradient-to-br from-[#2d3139] to-[#1a1d24] group-hover:scale-105 transition-transform duration-500 opacity-50" />
											</div>
											<CardHeader className="p-4">
												<CardTitle className="text-[15px] truncate pr-8">{design.name}</CardTitle>
												<CardDescription>
													{new Date(design.updated_at).toLocaleDateString()}
												</CardDescription>
											</CardHeader>
										</Card>
									</motion.div>
								))
							)}
						</div>
					</section>

					<section>
						<h2 className="text-xl font-semibold text-white mb-4">Start from Template</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{MOCK_TEMPLATES.map((template, i) => (
								<motion.div
									key={template.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.3, delay: 0.2 + (i * 0.1) }}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									<Card className="h-full cursor-pointer hover:border-[#3caff6]/50 transition-all hover:bg-white/[0.02]">
										<CardHeader>
											<CardTitle className="text-base text-[#3caff6]">{template.title}</CardTitle>
											<CardDescription className="line-clamp-2 mt-2 leading-relaxed">
												{template.description}
											</CardDescription>
										</CardHeader>
									</Card>
								</motion.div>
							))}
						</div>
					</section>

					<footer className="pt-8 mt-12 border-t border-[var(--color-border)] flex justify-between items-center text-sm text-[var(--color-text-muted)]">
						<p>© 2026 Primer Systems Inc.</p>
						<div className="flex gap-4">
							<a href="#" className="hover:text-white transition-colors">Help Center</a>
							<a href="#" className="hover:text-white transition-colors">Privacy</a>
							<a href="#" className="hover:text-white transition-colors">Terms</a>
						</div>
					</footer>
				</div>
			</main>
		</div>
	);
}
