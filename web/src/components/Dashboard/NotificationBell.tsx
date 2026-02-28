import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X } from 'lucide-react';
import { api } from '../../lib/api';

type NotificationItem = {
	id: string;
	sender_username: string;
	sender_avatar_url: string | null;
	design_id: string;
	design_name: string;
	status: string;
	message: string | null;
	created_at: string;
};

export function NotificationBell() {
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [count, setCount] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// Poll for notification count every 30 seconds
	useEffect(() => {
		fetchCount();
		const interval = setInterval(fetchCount, 30000);
		return () => clearInterval(interval);
	}, []);

	// Close on click outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	const fetchCount = async () => {
		try {
			const res = await api.get('/users/notifications/count');
			setCount(res.data.count);
		} catch {
			// Silently fail if not authenticated
		}
	};

	const fetchNotifications = async () => {
		setIsLoading(true);
		try {
			const res = await api.get('/users/notifications');
			setNotifications(res.data);
		} catch {
			// Fail silently
		} finally {
			setIsLoading(false);
		}
	};

	const handleToggle = () => {
		if (!isOpen) {
			fetchNotifications();
		}
		setIsOpen(!isOpen);
	};

	const handleAccept = async (id: string) => {
		try {
			await api.post(`/users/notifications/${id}/accept`);
			setNotifications((prev) => prev.filter((n) => n.id !== id));
			setCount((prev) => Math.max(0, prev - 1));
		} catch (err) {
			console.error('Failed to accept invite', err);
		}
	};

	const handleDecline = async (id: string) => {
		try {
			await api.post(`/users/notifications/${id}/decline`);
			setNotifications((prev) => prev.filter((n) => n.id !== id));
			setCount((prev) => Math.max(0, prev - 1));
		} catch (err) {
			console.error('Failed to decline invite', err);
		}
	};

	return (
		<div ref={ref} className="relative">
			{/* Bell Button */}
			<button
				onClick={handleToggle}
				className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors"
			>
				<Bell className="w-5 h-5" />
				{count > 0 && (
					<motion.span
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow-lg"
					>
						{count > 9 ? '9+' : count}
					</motion.span>
				)}
			</button>

			{/* Dropdown */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: 8, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.95 }}
						transition={{ duration: 0.15 }}
						className="absolute right-0 top-full mt-2 w-80 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden z-50"
					>
						<div className="p-4 border-b border-[var(--color-border)]">
							<h3 className="text-sm font-semibold text-white">Notifications</h3>
						</div>

						<div className="max-h-72 overflow-y-auto">
							{isLoading ? (
								<div className="p-6 text-center text-xs text-[var(--color-text-muted)]">Loading...</div>
							) : notifications.length === 0 ? (
								<div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
									No pending invites
								</div>
							) : (
								notifications.map((notif) => (
									<div key={notif.id} className="p-4 border-b border-[var(--color-border)] last:border-b-0 hover:bg-white/[0.02] transition-colors">
										<div className="flex items-start gap-3">
											{notif.sender_avatar_url ? (
												<img
													src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${notif.sender_avatar_url}`}
													alt={notif.sender_username}
													className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] flex-shrink-0"
													crossOrigin="anonymous"
												/>
											) : (
												<div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0">
													{notif.sender_username[0].toUpperCase()}
												</div>
											)}
											<div className="flex-1 min-w-0">
												<p className="text-sm text-white">
													<strong>{notif.sender_username}</strong>
													<span className="text-[var(--color-text-muted)]"> invited you to </span>
													<strong className="text-blue-400">{notif.design_name}</strong>
												</p>
												<p className="text-[10px] text-[var(--color-text-muted)] mt-1">
													{new Date(notif.created_at).toLocaleDateString()}
												</p>
												<div className="flex items-center gap-2 mt-2">
													<button
														onClick={() => handleAccept(notif.id)}
														className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
													>
														<Check className="w-3 h-3" /> Accept
													</button>
													<button
														onClick={() => handleDecline(notif.id)}
														className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
													>
														<X className="w-3 h-3" /> Decline
													</button>
												</div>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
