"use client";

import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";

interface FlipbookControlsProps {
	currentPage: number;
	displayPage: string;
	totalPages: number;
	isLastSpread: boolean;
	onPrevPage: () => void;
	onNextPage: () => void;
	onGoToPage: (page: number) => void;
	isMuted: boolean;
	onToggleMute: () => void;
}

export function FlipbookControls({
	currentPage,
	displayPage,
	totalPages,
	isLastSpread,
	onPrevPage,
	onNextPage,
	isMuted,
	onToggleMute,
}: FlipbookControlsProps) {
	return (
		<div className="flex items-center justify-center gap-4 mt-6">
			<button
				type="button"
				onClick={onPrevPage}
				disabled={currentPage === 0}
				className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
			>
				<ChevronLeft className="w-5 h-5" />
			</button>

			<span className="text-gray-300 min-w-[100px] text-center">
				Page {displayPage} of {totalPages}
			</span>

			<button
				type="button"
				onClick={onNextPage}
				disabled={isLastSpread}
				className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
			>
				<ChevronRight className="w-5 h-5" />
			</button>

			<button
				type="button"
				onClick={onToggleMute}
				title={isMuted ? "Unmute" : "Mute"}
				className="p-2 rounded-lg hover:bg-white/10 text-gray-300 transition-colors"
			>
				{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
			</button>
		</div>
	);
}
