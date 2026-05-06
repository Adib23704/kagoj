"use client";

import { Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook, { type FlipEvent } from "react-pageflip";
import { useSound } from "@/hooks/use-sound";
import { loadPdfjs } from "@/lib/pdf/pdfjs-client";
import { FlipbookControls } from "./flipbook-controls";

interface PageProps {
	number: number;
	imageUrl: string;
}

const Page = React.forwardRef<HTMLDivElement, PageProps>((props, ref) => {
	return (
		<div className="page bg-white" ref={ref}>
			{/* biome-ignore lint/performance/noImgElement: blob: URLs aren't supported by next/image */}
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

const SpacerPage = React.forwardRef<HTMLDivElement>((_, ref) => {
	return <div ref={ref} className="bg-flipbook w-full h-full" />;
});
SpacerPage.displayName = "SpacerPage";

interface FlipbookViewerProps {
	pdfUrl: string;
	title?: string;
}

interface RenderedPage {
	pageNumber: number;
	imageUrl: string;
}

export function FlipbookViewer({ pdfUrl, title }: FlipbookViewerProps) {
	const bookRef = useRef<HTMLFlipBook>(null);
	const objectUrlsRef = useRef<string[]>([]);
	const [pages, setPages] = useState<RenderedPage[]>([]);
	const [currentPage, setCurrentPage] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const { playPageTurn, isMuted, toggleMute } = useSound();

	const [dimensions, setDimensions] = useState({ width: 450, height: 600 });

	useEffect(() => {
		const updateDimensions = () => {
			const maxPageWidth = Math.min(450, (window.innerWidth * 0.9) / 2);
			const maxHeight = window.innerHeight * 0.78;
			const aspectRatio = Math.SQRT1_2;

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

	useEffect(() => {
		let cancelled = false;
		const created: string[] = [];

		async function loadPages() {
			setIsLoading(true);
			setError(null);
			setLoadingProgress(0);

			try {
				const pdfjs = await loadPdfjs();
				const pdf = await pdfjs.getDocument(pdfUrl).promise;
				const renderedPages: RenderedPage[] = [];
				const scale = 2;
				let lastReportedBucket = -1;

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
						viewport,
						canvas,
					}).promise;

					const blob = await new Promise<Blob>((resolve, reject) => {
						canvas.toBlob(
							(b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
							"image/jpeg",
							0.85
						);
					});

					if (cancelled) return;

					const url = URL.createObjectURL(blob);
					created.push(url);
					renderedPages.push({ pageNumber: pageNum, imageUrl: url });

					const pct = Math.round((pageNum / pdf.numPages) * 100);
					const bucket = Math.floor(pct / 5);
					if (bucket !== lastReportedBucket) {
						setLoadingProgress(pct);
						lastReportedBucket = bucket;
					}
				}

				if (cancelled) return;

				const prior = objectUrlsRef.current;
				objectUrlsRef.current = created;
				for (const url of prior) URL.revokeObjectURL(url);

				setPages(renderedPages);
				setIsLoading(false);
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
			if (objectUrlsRef.current !== created) {
				for (const url of created) URL.revokeObjectURL(url);
			}
		};
	}, [pdfUrl]);

	useEffect(() => {
		return () => {
			for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
			objectUrlsRef.current = [];
		};
	}, []);

	const onFlip = useCallback(
		(e: FlipEvent) => {
			setCurrentPage(e.data);
			playPageTurn();
		},
		[playPageTurn]
	);

	const totalFlipbookPages = pages.length + 1 + (pages.length % 2 === 0 ? 1 : 0);
	const lastSpreadIndex = totalFlipbookPages - 2;
	const isLastSpread = currentPage >= lastSpreadIndex;

	const goToPage = useCallback((pageNum: number) => {
		bookRef.current?.pageFlip().flip(pageNum);
	}, []);

	const nextPage = useCallback(() => {
		bookRef.current?.pageFlip().flipNext();
	}, []);

	const prevPage = useCallback(() => {
		bookRef.current?.pageFlip().flipPrev();
	}, []);

	const displayPage = useMemo(() => {
		if (currentPage === 0) return "1";
		const leftPage = currentPage;
		const rightPage = currentPage + 1;
		if (rightPage > pages.length) return String(leftPage);
		return `${leftPage}-${rightPage}`;
	}, [currentPage, pages.length]);

	const flipbookChildren = useMemo(
		() => [
			<SpacerPage key="spacer-start" />,
			...pages.map((page) => (
				<Page key={page.pageNumber} number={page.pageNumber} imageUrl={page.imageUrl} />
			)),
			...(pages.length % 2 === 0 ? [<SpacerPage key="spacer-end" />] : []),
		],
		[pages]
	);

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
					{flipbookChildren}
				</HTMLFlipBook>
			</div>

			<FlipbookControls
				currentPage={currentPage}
				displayPage={displayPage}
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
