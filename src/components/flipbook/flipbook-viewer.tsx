"use client";

import { Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import React, { useCallback, useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { useSound } from "@/hooks/use-sound";
import { FlipbookControls } from "./flipbook-controls";

// Set worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PageProps {
  number: number;
  imageUrl: string;
}

const Page = React.forwardRef<HTMLDivElement, PageProps>((props, ref) => {
  return (
    <div className="page bg-white" ref={ref}>
      <img
        src={props.imageUrl}
        alt={`Page ${props.number}`}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
});
Page.displayName = "Page";

interface FlipbookViewerProps {
  pdfUrl: string;
  pageCount: number;
  title?: string;
}

interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
}

export function FlipbookViewer({ pdfUrl, pageCount, title }: FlipbookViewerProps) {
  const bookRef = useRef<any>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { playPageTurn, isMuted, toggleMute } = useSound();

  // Calculate dimensions for the flipbook
  const [dimensions, setDimensions] = useState({ width: 400, height: 533 });

  useEffect(() => {
    const updateDimensions = () => {
      const maxWidth = Math.min(500, window.innerWidth * 0.45);
      const maxHeight = window.innerHeight * 0.75;
      const aspectRatio = 3 / 4; // Standard PDF aspect ratio

      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Load and render PDF pages
  useEffect(() => {
    let cancelled = false;

    async function loadPages() {
      setIsLoading(true);
      setError(null);

      try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const renderedPages: RenderedPage[] = [];
        const scale = 2; // Higher quality

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          renderedPages.push({
            pageNumber: pageNum,
            dataUrl: canvas.toDataURL("image/jpeg", 0.85),
          });

          setLoadingProgress(Math.round((pageNum / pdf.numPages) * 100));
        }

        if (!cancelled) {
          setPages(renderedPages);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF. Please try again.");
          setIsLoading(false);
        }
      }
    }

    loadPages();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  const onFlip = useCallback(
    (e: any) => {
      setCurrentPage(e.data);
      playPageTurn();
    },
    [playPageTurn],
  );

  const goToPage = (pageNum: number) => {
    bookRef.current?.pageFlip().flip(pageNum);
  };

  const nextPage = () => {
    bookRef.current?.pageFlip().flipNext();
  };

  const prevPage = () => {
    bookRef.current?.pageFlip().flipPrev();
  };

  if (error) {
    return (
      <div className="flipbook-container">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flipbook-container">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Loading flipbook...</p>
          <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{loadingProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flipbook-container">
      {title && <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>}

      <div className="relative">
        {/* @ts-ignore - react-pageflip types issue */}
        <HTMLFlipBook
          ref={bookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="stretch"
          minWidth={280}
          maxWidth={600}
          minHeight={373}
          maxHeight={800}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onFlip}
          className="flipbook"
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.5}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {pages.map((page) => (
            <Page key={page.pageNumber} number={page.pageNumber} imageUrl={page.dataUrl} />
          ))}
        </HTMLFlipBook>
      </div>

      <FlipbookControls
        currentPage={currentPage}
        totalPages={pages.length}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onGoToPage={goToPage}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
    </div>
  );
}
