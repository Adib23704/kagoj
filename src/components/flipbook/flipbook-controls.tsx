"use client";

import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlipbookControlsProps {
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function FlipbookControls({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  isMuted,
  onToggleMute,
}: FlipbookControlsProps) {
  // In flipbook mode, currentPage represents the spread (0-indexed)
  // Page 0 = cover (page 1), then each spread shows 2 pages
  const displayPage = currentPage + 1;

  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <Button variant="secondary" size="sm" onClick={onPrevPage} disabled={currentPage === 0}>
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <span className="text-gray-600 min-w-[100px] text-center">
        Page {displayPage} of {totalPages}
      </span>

      <Button
        variant="secondary"
        size="sm"
        onClick={onNextPage}
        disabled={currentPage >= totalPages - 1}
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      <Button variant="ghost" size="sm" onClick={onToggleMute} title={isMuted ? "Unmute" : "Mute"}>
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-gray-500" />
        ) : (
          <Volume2 className="w-5 h-5 text-gray-500" />
        )}
      </Button>
    </div>
  );
}
