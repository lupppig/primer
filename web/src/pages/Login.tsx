import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/Common/Card';
import { Box, AlertCircle, Github } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// We import the config to hit the backend absolute URL for the OAuth redirect.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function Login() {
	const navigate = useNavigate();
	const { error, clearError, user } = useAuthStore();

	// Redirect to dashboard if successfully logged in (e.g. after OAuth redirect completes)
	useEffect(() => {
		if (user) {
			navigate('/dashboard');
		}
	}, [user, navigate]);

	useEffect(() => {
		clearError();
	}, [clearError]);

	const handleGithubLogin = () => {
		// Pushing the window location forces a hard redirect to the backend FastAPI server
		// which will then immediately redirect the user to github.com/login/oauth/authorize
		window.location.href = `${API_URL}/auth/oauth/github`;
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
							Welcome to Primer
						</CardTitle>
						<CardDescription>
							Sign in with GitHub to start designing cloud architectures
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 pt-4">
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

						<Button
							type="button"
							className="w-full bg-[#24292e] hover:bg-[#2f363d] text-white flex items-center justify-center gap-2 border border-[#1b1f23]/10"
							onClick={handleGithubLogin}
						>
							<Github className="w-5 h-5" />
							Continue with GitHub
						</Button>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4">
						<div className="text-sm text-center text-[var(--color-text-muted)] space-y-2">
							<p>
								By signing in, you agree to our Terms of Service and Privacy Policy.
							</p>
						</div>
					</CardFooter>
				</Card>
			</motion.div>
		</div>
	);
}
