import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Globe, Lock, UserPlus, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '../Common/Button';
import { api } from '../../lib/api';

type Collaborator = {
	id: string;
	user_id: string;
	username: string;
	email: string;
	avatar_url: string | null;
	permission: string;
};

type ShareModalProps = {
	isOpen: boolean;
	onClose: () => void;
	designId: string;
	designName: string;
};

export function ShareModal({ isOpen, onClose, designId, designName }: ShareModalProps) {
	const [email, setEmail] = useState('');
	const [isPublic, setIsPublic] = useState(false);
	const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (isOpen && designId) {
			loadData();
		}
	}, [isOpen, designId]);

	const loadData = async () => {
		setIsLoading(true);
		try {
			const [collabRes] = await Promise.all([
				api.get(`/canvas/design/${designId}/collaborators`),
			]);
			setCollaborators(collabRes.data);
		} catch (err) {
			console.error('Failed to load collaborators', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleInvite = async () => {
		if (!email.trim()) return;
		setIsSending(true);
		setMessage(null);
		try {
			const res = await api.post(`/canvas/design/${designId}/invite`, { email });
			setMessage({ type: 'success', text: res.data.detail });
			setEmail('');
			loadData();
		} catch (err: any) {
			setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to send invite.' });
		} finally {
			setIsSending(false);
		}
	};

	const handleToggleVisibility = async () => {
		try {
			const res = await api.put(`/canvas/design/${designId}/visibility`, { is_public: !isPublic });
			setIsPublic(res.data.is_public);
		} catch (err) {
			console.error('Failed to toggle visibility', err);
		}
	};

	const handleRemove = async (userId: string) => {
		try {
			await api.delete(`/canvas/design/${designId}/collaborator/${userId}`);
			setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
		} catch (err) {
			console.error('Failed to remove collaborator', err);
		}
	};

	const handleCopyLink = () => {
		navigator.clipboard.writeText(`${window.location.origin}/canvas?id=${designId}`);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 flex items-center justify-center"
				onClick={onClose}
			>
				<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 20 }}
					transition={{ duration: 0.2 }}
					className="relative w-full max-w-md bg-[var(--color-panel)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
								<Share2 className="w-4 h-4 text-blue-400" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-white">Share "{designName}"</h3>
								<p className="text-xs text-[var(--color-text-muted)]">Invite others to collaborate</p>
							</div>
						</div>
						<button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Visibility Toggle */}
					<div className="p-5 border-b border-[var(--color-border)]">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								{isPublic ? (
									<Globe className="w-4 h-4 text-emerald-400" />
								) : (
									<Lock className="w-4 h-4 text-amber-400" />
								)}
								<div>
									<p className="text-sm font-medium text-white">{isPublic ? 'Public' : 'Private'}</p>
									<p className="text-xs text-[var(--color-text-muted)]">
										{isPublic ? 'Anyone with the link can view' : 'Only invited people can access'}
									</p>
								</div>
							</div>
							<button
								onClick={handleToggleVisibility}
								className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`}
							>
								<motion.div
									animate={{ x: isPublic ? 20 : 2 }}
									transition={{ duration: 0.2 }}
									className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
								/>
							</button>
						</div>

						{/* Copy Link */}
						<div className="mt-3 flex gap-2">
							<div className="flex-1 bg-black/30 border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-muted)] truncate font-mono">
								{window.location.origin}/canvas?id={designId.slice(0, 8)}...
							</div>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5 border-[var(--color-border)]"
								onClick={handleCopyLink}
							>
								{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
								{copied ? 'Copied' : 'Copy'}
							</Button>
						</div>
					</div>

					{/* Invite Input */}
					<div className="p-5 border-b border-[var(--color-border)]">
						<div className="flex gap-2">
							<input
								type="email"
								placeholder="Enter email to invite..."
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
								className="flex-1 bg-black/30 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--color-text-muted)] outline-none focus:border-blue-500 transition-colors"
							/>
							<Button
								size="sm"
								className="gap-1.5"
								onClick={handleInvite}
								disabled={isSending || !email.trim()}
							>
								{isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
								Invite
							</Button>
						</div>
						{message && (
							<p className={`mt-2 text-xs ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
								{message.text}
							</p>
						)}
					</div>

					{/* Collaborators List */}
					<div className="p-5 max-h-48 overflow-y-auto">
						<p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
							Collaborators ({collaborators.length})
						</p>
						{isLoading ? (
							<div className="flex justify-center py-4">
								<Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
							</div>
						) : collaborators.length === 0 ? (
							<p className="text-xs text-[var(--color-text-muted)] text-center py-4">
								No collaborators yet. Invite someone!
							</p>
						) : (
							<div className="space-y-2">
								{collaborators.map((collab) => (
									<div key={collab.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
										<div className="flex items-center gap-3">
											{collab.avatar_url ? (
												<img
													src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${collab.avatar_url}`}
													alt={collab.username}
													className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]"
													crossOrigin="anonymous"
												/>
											) : (
												<div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
													{collab.username[0].toUpperCase()}
												</div>
											)}
											<div>
												<p className="text-sm text-white font-medium">{collab.username}</p>
												<p className="text-xs text-[var(--color-text-muted)]">{collab.email}</p>
											</div>
										</div>
										<button
											onClick={() => handleRemove(collab.user_id)}
											className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
