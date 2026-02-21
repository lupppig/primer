import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/Common/Card';
import { Input } from '../components/Common/Input';
import { Box, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
	const navigate = useNavigate();
	const [isLoginMode, setIsLoginMode] = useState(true);

	const { login, register, isLoading, error, clearError, user } = useAuthStore();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [username, setUsername] = useState('');

	// Redirect to dashboard if successfully logged in
	useEffect(() => {
		if (user) {
			navigate('/dashboard');
		}
	}, [user, navigate]);

	// Clear errors when toggling modes
	useEffect(() => {
		clearError();
	}, [isLoginMode, clearError]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (isLoginMode) {
				await login(email, password);
			} else {
				await register(email, username, password);
			}
			navigate('/dashboard');
		} catch (err) {
			// Errors are already handled and stored by Zustand
			console.error("Auth Error", err);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] p-4">
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3, ease: 'easeOut' }}
				className="w-full max-w-md"
			>
				<div className="flex justify-center mb-8">
					<div className="flex items-center gap-2">
						<Box className="w-8 h-8 text-[var(--color-primary)]" />
						<h1 className="text-3xl font-heading font-bold text-white tracking-tight">Primer</h1>
					</div>
				</div>

				<Card className="border-[var(--color-border)]/50 shadow-2xl shadow-black/50 overflow-hidden">
					<CardHeader className="space-y-1 text-center">
						<CardTitle className="text-2xl">
							{isLoginMode ? 'Welcome back' : 'Create an account'}
						</CardTitle>
						<CardDescription>
							{isLoginMode
								? 'Enter your details to access your system diagrams'
								: 'Sign up to start designing cloud architectures'}
						</CardDescription>
					</CardHeader>
					<form onSubmit={handleSubmit}>
						<CardContent className="space-y-4">
							<AnimatePresence mode="wait">
								{error && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-md flex items-center gap-2"
									>
										<AlertCircle className="w-4 h-4 shrink-0" />
										<p>{error}</p>
									</motion.div>
								)}
							</AnimatePresence>

							{!isLoginMode && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									className="space-y-2"
								>
									<Input
										id="username"
										type="text"
										placeholder="Username"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										required={!isLoginMode}
										className="bg-[#0f1115]"
									/>
								</motion.div>
							)}

							<div className="space-y-2">
								<Input
									id="email"
									type="email"
									placeholder="name@company.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="bg-[#0f1115]"
								/>
							</div>
							<div className="space-y-2">
								<Input
									id="password"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									minLength={8}
									className="bg-[#0f1115]"
								/>
							</div>
						</CardContent>
						<CardFooter className="flex flex-col space-y-4">
							<Button type="submit" className="w-full" isLoading={isLoading}>
								{isLoginMode ? 'Sign In' : 'Sign Up'}
							</Button>

							<div className="text-sm text-center text-[var(--color-text-muted)] space-y-2">
								{isLoginMode && (
									<a href="#" className="hover:text-white transition-colors block">
										Forgot password?
									</a>
								)}
								<p>
									{isLoginMode ? 'New to Primer?' : 'Already have an account?'}
									{' '}
									<button
										type="button"
										onClick={() => setIsLoginMode(!isLoginMode)}
										className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors focus:outline-none"
									>
										{isLoginMode ? 'Create an account' : 'Sign in instead'}
									</button>
								</p>
							</div>
						</CardFooter>
					</form>
				</Card>
			</motion.div>
		</div>
	);
}
