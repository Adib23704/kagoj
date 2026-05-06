"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSound() {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isMuted, setIsMuted] = useState(false);

	useEffect(() => {
		const audio = new Audio("/sounds/page-turn.mp3");
		audio.preload = "auto";
		audio.volume = 0.5;
		audioRef.current = audio;

		return () => {
			audio.pause();
			audioRef.current = null;
		};
	}, []);

	const playPageTurn = useCallback(() => {
		if (isMuted) return;
		const audio = audioRef.current;
		if (!audio) return;
		audio.currentTime = 0;
		audio.play().catch(() => {});
	}, [isMuted]);

	const toggleMute = useCallback(() => {
		setIsMuted((prev) => !prev);
	}, []);

	return {
		playPageTurn,
		isMuted,
		toggleMute,
	};
}
