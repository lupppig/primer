import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Upload, Check, AlertCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
	const { user, checkAuth } = useAuthStore();
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// 5MB Validation
		if (file.size > 5 * 1024 * 1024) {
			setError("File size must be under 5MB");
			return;
		}

		setIsUploading(true);
		setError(null);
		setSuccess(false);

		const formData = new FormData();
		formData.append('file', file);

		try {
			await api.post('/users/me/avatar', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			setSuccess(true);
			await checkAuth(); // Refresh user data to get the new avatar_url
		} catch (err: any) {
			setError(err.response?.data?.detail || "Failed to upload avatar");
		} finally {
			setIsUploading(false);
		}
	};

	if (!isOpen || !user) return null;

	return (
		<AnimatePresence>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
					className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				/>
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					className="relative w-full max-w-md bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl shadow-2xl p-6"
				>
					<button
						onClick={onClose}
						className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white transition-colors"
					>
						<X className="w-5 h-5" />
					</button>

					<div className="flex items-center gap-3 mb-6">
						<Settings className="w-6 h-6 text-[var(--color-primary)]" />
						<h2 className="text-xl font-heading font-bold text-white tracking-tight">Account Settings</h2>
					</div>

					<div className="space-y-6">
						{/* Profile Picture Section */}
						<div>
							<h3 className="text-sm font-medium text-white mb-3">Profile Picture</h3>
							<div className="flex items-center gap-4">
								<div className="relative group w-16 h-16 rounded-full overflow-hidden border border-[#333] bg-[#1a1c23] flex items-center justify-center">
									{user.avatar_url ? (
										<img
											src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${user.avatar_url}`}
											alt="Avatar"
											className="w-full h-full object-cover"
											crossOrigin="anonymous"
										/>
									) : (
										<span className="text-2xl font-bold text-[#888] uppercase">{user.username.charAt(0)}</span>
									)}
									<div
										className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-colors"
										onClick={() => fileInputRef.current?.click()}
									>
										<Upload className="w-5 h-5 text-white" />
									</div>
								</div>

								<div className="space-y-1">
									<Button
										variant="outline"
										size="sm"
										onClick={() => fileInputRef.current?.click()}
										isLoading={isUploading}
									>
										Upload new image
									</Button>
									<p className="text-xs text-[var(--color-text-muted)]">Max 5MB. PNG, JPEG or GIF.</p>
								</div>

								{/* Hidden file input */}
								<input
									type="file"
									ref={fileInputRef}
									className="hidden"
									accept="image/png, image/jpeg, image/gif"
									onChange={handleFileChange}
								/>
							</div>
						</div>

						{error && (
							<div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded flex items-center gap-2">
								<AlertCircle className="w-4 h-4 shrink-0" />
								<p>{error}</p>
							</div>
						)}
						{success && (
							<div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded flex items-center gap-2">
								<Check className="w-4 h-4 shrink-0" />
								<p>Profile picture updated explicitly!</p>
							</div>
						)}

						{/* Read Only Fields */}
						<div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Username</label>
								<Input value={user.username} readOnly className="opacity-50" />
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Email</label>
								<Input value={user.email} readOnly className="opacity-50" />
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Connected Provider</label>
								<Input value={user.provider || "GitHub"} readOnly className="opacity-50 capitalize" />
							</div>
						</div>

					</div>
				</motion.div>
			</div>
		</AnimatePresence>
	);
}
