import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { X, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthModal() {
	const {
		isAuthModalOpen,
		setAuthModalOpen,
		authView,
		setAuthView,
		login,
		register,
		isLoading,
		error,
		clearError
	} = useAuthStore();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [username, setUsername] = useState('');

	if (!isAuthModalOpen) return null;

	const handleAction = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (authView === 'login') {
				await login(email, password);
			} else {
				await register(email, username, password);
			}
			setAuthModalOpen(false);
		} catch (err) {
			// Error is handled in the store
		}
	};

	const toggleView = () => {
		clearError();
		setAuthView(authView === 'login' ? 'signup' : 'login');
	};

	return (
		<AnimatePresence>
			<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
				{/* Backdrop */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={() => setAuthModalOpen(false)}
					className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				/>

				{/* Modal Content */}
				<motion.div
					initial={{ opacity: 0, scale: 0.9, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 20 }}
					className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-2xl"
				>
					<div className="absolute top-4 right-4">
						<button
							onClick={() => setAuthModalOpen(false)}
							className="p-1 rounded-full hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					<div className="p-8">
						<div className="text-center mb-8">
							<h2 className="text-2xl font-heading font-bold text-white tracking-tight">
								{authView === 'login' ? 'Welcome Back' : 'Create Account'}
							</h2>
							<p className="text-sm text-[var(--color-text-muted)] mt-2">
								{authView === 'login'
									? 'Log in to save your architecture designs to the cloud.'
									: 'Sign up to start saving and sharing your system designs.'}
							</p>
						</div>

						{error && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm"
							>
								<AlertCircle className="w-4 h-4 shrink-0" />
								{error}
							</motion.div>
						)}

						<form onSubmit={handleAction} className="space-y-4">
							{authView === 'signup' && (
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-white/70 ml-1 uppercase tracking-wider">Username</label>
									<div className="relative">
										<User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
										<Input
											placeholder="architect123"
											className="pl-10 h-11"
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											required
										/>
									</div>
								</div>
							)}

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-white/70 ml-1 uppercase tracking-wider">Email Address</label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
									<Input
										type="email"
										placeholder="name@company.com"
										className="pl-10 h-11"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-white/70 ml-1 uppercase tracking-wider">Password</label>
								<div className="relative">
									<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
									<Input
										type="password"
										placeholder="••••••••"
										className="pl-10 h-11"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
									/>
								</div>
							</div>

							<Button
								type="submit"
								className="w-full h-11 mt-4 text-sm font-bold gap-2"
								disabled={isLoading}
							>
								{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authView === 'login' ? 'Sign In' : 'Create Account')}
							</Button>
						</form>

						<div className="mt-8 text-center">
							<p className="text-sm text-[var(--color-text-muted)]">
								{authView === 'login' ? "Don't have an account?" : "Already have an account?"}
								<button
									onClick={toggleView}
									className="ml-2 text-[var(--color-primary)] font-semibold hover:underline"
								>
									{authView === 'login' ? 'Sign up' : 'Log in'}
								</button>
							</p>
						</div>
					</div>
				</motion.div>
			</div>
		</AnimatePresence>
	);
}
