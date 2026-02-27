import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileImage, FileText, FileCode, MonitorPlay, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../Common/Button';
import { api } from '../../lib/api';
import { useDesignStore } from '../../store/useDesignStore';

interface ExportPopoverProps {
	onClose: () => void;
}

type ExportFmt = 'PNG' | 'JPG' | 'PDF' | 'SVG' | 'GIF';

interface ExportStatus {
	status: 'queued' | 'processing' | 'completed' | 'failed';
	file_url?: string;
	error_message?: string;
}

export default function ExportPopover({ onClose }: ExportPopoverProps) {
	const { currentDesign } = useDesignStore();
	const [fmt, setFmt] = useState<ExportFmt>('PNG');
	const [isExporting, setIsExporting] = useState(false);
	const [exportId, setExportId] = useState<string | null>(null);
	const [status, setStatus] = useState<ExportStatus | null>(null);

	const formatOptions = [
		{ id: 'PNG', label: 'PNG Image', icon: FileImage, desc: 'High quality raster' },
		{ id: 'JPG', label: 'JPEG Image', icon: FileImage, desc: 'Compressed raster' },
		{ id: 'PDF', label: 'PDF Document', icon: FileText, desc: 'Vector-ready document' },
		{ id: 'SVG', label: 'SVG Vector', icon: FileCode, desc: 'Scalable vector graphic' },
		{ id: 'GIF', label: 'Simulation GIF', icon: MonitorPlay, desc: '6s recorded animation' },
	] as const;

	const handleExport = async () => {
		if (!currentDesign) return;
		setIsExporting(true);
		setStatus({ status: 'queued' });

	try {
		// Determine connection quality for GIF resolution scaling
		let quality = 'high';
		if (fmt === 'GIF') {
			const nav = navigator as any;
			const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
			if (connection && (connection.effectiveType === '2g' || connection.effectiveType === '3g')) {
				quality = 'low';
			}
		}

		const response = await api.post(`/simulation/export`, {
			design_id: currentDesign.id,
			format: fmt,
			options: { quality }
		});
		setExportId(response.data.id);
	} catch (err) {
		console.error("Export failed", err);
		setStatus({ status: 'failed', error_message: 'Failed to trigger export' });
		setIsExporting(false);
	}
};

// Polling with exponential backoff
useEffect(() => {
	if (!exportId || !isExporting) return;

	let interval = 2000;
	let timeout: any;

	const poll = async () => {
		try {
			const response = await api.get(`/simulation/export/${exportId}`);
			const data = response.data;
			setStatus(data);

			if (data.status === 'completed' || data.status === 'failed') {
				setIsExporting(false);
				return;
			}

			// Increase interval slightly for backoff
			interval = Math.min(interval * 1.5, 10000);
			timeout = setTimeout(poll, interval);
		} catch (err) {
			console.error("Polling failed", err);
			timeout = setTimeout(poll, interval);
		}
	};

	timeout = setTimeout(poll, interval);
	return () => clearTimeout(timeout);
}, [exportId, isExporting]);

return (
	<motion.div
		initial={{ opacity: 0, x: -10, scale: 0.95 }}
		animate={{ opacity: 1, x: 0, scale: 1 }}
		exit={{ opacity: 0, x: -10, scale: 0.95 }}
		className="w-72 bg-[#13151a] border border-[var(--color-border)] rounded-xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden"
	>
		<div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-panel)] flex justify-between items-center">
			<h3 className="font-heading font-semibold text-white text-sm flex items-center gap-2">
				<Download className="w-4 h-4 text-blue-400" /> Export Project
			</h3>
		</div>

		<div className="p-4 space-y-4">
			{!status || status.status === 'failed' ? (
				<>
					<div className="grid grid-cols-1 gap-2">
						{formatOptions.map((opt) => {
							const Icon = opt.icon;
							const isSelected = fmt === opt.id;
							return (
								<button
									key={opt.id}
									onClick={() => setFmt(opt.id as ExportFmt)}
									className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all text-left group
											${isSelected
											? 'bg-blue-500/10 border-blue-500/50 text-white'
											: 'bg-white/5 border-transparent text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white'}`}
								>
									<div className={`mt-0.5 p-1.5 rounded-md ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/5 group-hover:bg-white/10'}`}>
										<Icon className="w-3.5 h-3.5" />
									</div>
									<div>
										<div className="text-xs font-semibold">{opt.label}</div>
										<div className="text-[10px] opacity-60">{opt.desc}</div>
									</div>
								</button>
							);
						})}
					</div>

					{status?.status === 'failed' && (
						<div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px]">
							<AlertCircle className="w-3.5 h-3.5" />
							{status.error_message || 'Export failed. Please try again.'}
						</div>
					)}

					<Button
						className="w-full h-9 text-xs gap-2"
						disabled={isExporting}
						onClick={handleExport}
					>
						<Download className="w-3.5 h-3.5" /> Start Export
					</Button>
				</>
			) : (
				<div className="py-4 flex flex-col items-center text-center space-y-4">
					{status.status === 'completed' ? (
						<>
							<div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
								<CheckCircle2 className="w-6 h-6" />
							</div>
							<div>
								<div className="text-sm font-bold text-white">Export Ready!</div>
								<div className="text-[10px] text-[var(--color-text-muted)] mt-1 flex items-center gap-1 justify-center">
									<Clock className="w-3 h-3" /> Expires in 24 hours
								</div>
							</div>
							<Button
								className="w-full h-9 text-xs gap-2"
								onClick={() => window.open(status.file_url, '_blank')}
							>
								<Download className="w-3.5 h-3.5" /> Download {fmt}
							</Button>
							<button
								onClick={() => setStatus(null)}
								className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
							>
								Export another format
							</button>
						</>
					) : (
						<>
							<div className="relative">
								<Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="w-6 h-6 rounded-full bg-blue-500/10" />
								</div>
							</div>
							<div>
								<div className="text-sm font-bold text-white capitalize">{status.status}...</div>
								<div className="text-[10px] text-[var(--color-text-muted)] mt-1">
									{status.status === 'queued' ? 'Waiting for available worker' : 'Rendering canvas components'}
								</div>
							</div>
							<div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
								<motion.div
									className="bg-blue-500 h-full"
									animate={{ width: status.status === 'queued' ? '30%' : '70%' }}
									transition={{ duration: 1 }}
								/>
							</div>
						</>
					)}
				</div>
			)}
		</div>

		<div className="p-3 bg-black/20 border-t border-[var(--color-border)]/50 flex justify-center">
			<button
				onClick={onClose}
				className="text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
			>
				Dismiss
			</button>
		</div>
	</motion.div>
);
}
