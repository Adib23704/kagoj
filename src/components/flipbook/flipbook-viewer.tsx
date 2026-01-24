"use client";

import { Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import HTMLFlipBook, { type FlipEvent } from "react-pageflip";
import { useSound } from "@/hooks/use-sound";
import { FlipbookControls } from "./flipbook-controls";

type PDFJSLib = typeof import("pdfjs-dist");

interface PageProps {
	number: number;
	imageUrl: string;
}

const Page = React.forwardRef<HTMLDivElement, PageProps>((props, ref) => {
	return (
		<div className="page bg-white" ref={ref}>
			{/* biome-ignore lint/performance/noImgElement: Using img for PDF.js data URLs which Next.js Image can't handle */}
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

// Invisible spacer page that blends with dark background
const SpacerPage = React.forwardRef<HTMLDivElement>((_, ref) => {
	return <div ref={ref} style={{ backgroundColor: "#3d3d3d", width: "100%", height: "100%" }} />;
});
SpacerPage.displayName = "SpacerPage";

interface FlipbookViewerProps {
	pdfUrl: string;
	title?: string;
}

interface RenderedPage {
	pageNumber: number;
	dataUrl: string;
}

export function FlipbookViewer({ pdfUrl, title }: FlipbookViewerProps) {
	const bookRef = useRef<HTMLFlipBook>(null);
	const pdfjsRef = useRef<PDFJSLib | null>(null);
	const [pages, setPages] = useState<RenderedPage[]>([]);
	const [currentPage, setCurrentPage] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const { playPageTurn, isMuted, toggleMute } = useSound();

	// Calculate dimensions for the flipbook - double page spread mode
	const [dimensions, setDimensions] = useState({ width: 450, height: 600 });

	const loadPdfjs = useCallback(async (): Promise<PDFJSLib> => {
		if (pdfjsRef.current) return pdfjsRef.current;

		const pdfjs = await import("pdfjs-dist");
		pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
		pdfjsRef.current = pdfjs;
		return pdfjs;
	}, []);

	useEffect(() => {
		const updateDimensions = () => {
			// Double page spread - each page dimension (total width will be 2x for spreads)
			const maxPageWidth = Math.min(450, (window.innerWidth * 0.9) / 2);
			const maxHeight = window.innerHeight * 0.78;
			const aspectRatio = Math.SQRT1_2; // A4 aspect ratio

			let height = maxHeight;
			let width = height * aspectRatio;

			if (width > maxPageWidth) {
				width = maxPageWidth;
				height = width / aspectRatio;
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
				const pdfjs = await loadPdfjs();
				const pdf = await pdfjs.getDocument(pdfUrl).promise;
				const renderedPages: RenderedPage[] = [];
				const scale = 2; // Higher quality

				for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
					if (cancelled) return;

					const page = await pdf.getPage(pageNum);
					const viewport = page.getViewport({ scale });

					const canvas = document.createElement("canvas");
					const context = canvas.getContext("2d");
					if (!context) {
						throw new Error("Could not get canvas 2d context");
					}
					canvas.width = viewport.width;
					canvas.height = viewport.height;

					await page.render({
						canvasContext: context,
						viewport: viewport,
						canvas: canvas,
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
	}, [pdfUrl, loadPdfjs]);

	const onFlip = useCallback(
		(e: FlipEvent) => {
			setCurrentPage(e.data);
			playPageTurn();
		},
		[playPageTurn]
	);

	// Total flipbook pages (including spacers)
	// Spacer at start always, spacer at end only if even number of PDF pages
	const totalFlipbookPages = pages.length + 1 + (pages.length % 2 === 0 ? 1 : 0);

	// Last valid currentPage index (spreads are at even indices: 0, 2, 4, 6...)
	const lastSpreadIndex = totalFlipbookPages - 2;

	const goToPage = (pageNum: number) => {
		bookRef.current?.pageFlip().flip(pageNum);
	};

	const nextPage = () => {
		bookRef.current?.pageFlip().flipNext();
	};

	const prevPage = () => {
		bookRef.current?.pageFlip().flipPrev();
	};

	// Calculate display page string for user-friendly numbering
	// Layout: [Spacer(0), Page1(1), Page2(2), Page3(3), ...]
	// currentPage 0: Spacer + Page1 → "1" (single)
	// currentPage 2: Page2 + Page3 → "2-3" (spread)
	// currentPage 4: Page4 + Page5 → "4-5" (spread)
	// Last spread with even pages: Page12 + Spacer → "12" (single)
	const getDisplayPage = (): string => {
		if (currentPage === 0) {
			// First spread: spacer + page 1
			return "1";
		}

		const leftPage = currentPage; // PDF page on left
		const rightPage = currentPage + 1; // PDF page on right

		// Check if right page exists (not a spacer)
		if (rightPage > pages.length) {
			// Last page alone (even total pages)
			return String(leftPage);
		}

		return `${leftPage}-${rightPage}`;
	};

	// Check if we're at the last spread
	const isLastSpread = currentPage >= lastSpreadIndex;

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
					<Loader2 className="w-12 h-12 animate-spin text-gray-300 mx-auto mb-4" />
					<p className="text-gray-300 mb-2">Loading flipbook...</p>
					<div className="w-48 h-2 bg-gray-600 rounded-full mx-auto overflow-hidden">
						<div
							className="h-full bg-white transition-all duration-300"
							style={{ width: `${loadingProgress}%` }}
						/>
					</div>
					<p className="text-sm text-gray-400 mt-2">{loadingProgress}%</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flipbook-container">
			{title && <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>}

			<div className="relative">
				{/* @ts-ignore - react-pageflip types issue */}
				<HTMLFlipBook
					ref={bookRef}
					width={dimensions.width}
					height={dimensions.height}
					size="fixed"
					minWidth={300}
					maxWidth={550}
					minHeight={400}
					maxHeight={780}
					showCover={false}
					mobileScrollSupport={true}
					onFlip={onFlip}
					className="flipbook"
					style={{}}
					startPage={0}
					drawShadow={true}
					flippingTime={400}
					usePortrait={false}
					startZIndex={0}
					autoSize={false}
					maxShadowOpacity={0.4}
					showPageCorners={false}
					disableFlipByClick={false}
					swipeDistance={30}
				>
					{/* Build pages array with spacers */}
					{[
						<SpacerPage key="spacer-start" />,
						...pages.map((page) => (
							<Page key={page.pageNumber} number={page.pageNumber} imageUrl={page.dataUrl} />
						)),
						...(pages.length % 2 === 0 ? [<SpacerPage key="spacer-end" />] : []),
					]}
				</HTMLFlipBook>
			</div>

			<FlipbookControls
				currentPage={currentPage}
				displayPage={getDisplayPage()}
				totalPages={pages.length}
				isLastSpread={isLastSpread}
				onPrevPage={prevPage}
				onNextPage={nextPage}
				onGoToPage={goToPage}
				isMuted={isMuted}
				onToggleMute={toggleMute}
			/>
		</div>
	);
}
