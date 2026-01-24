"use client";

import { Howl } from "howler";
import { useCallback, useEffect, useRef, useState } from "react";

export function useSound() {
  const pageTurnRef = useRef<Howl | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [_soundAvailable, setSoundAvailable] = useState(true);

  useEffect(() => {
    try {
      pageTurnRef.current = new Howl({
        src: ["/sounds/page-turn.mp3"],
        volume: 0.5,
        preload: true,
        onloaderror: () => {
          setSoundAvailable(false);
        },
      });
    } catch {
      setSoundAvailable(false);
    }

    return () => {
      pageTurnRef.current?.unload();
    };
  }, []);

  const playPageTurn = useCallback(() => {
    if (!isMuted) {
      pageTurnRef.current?.play();
    }
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
