"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils";

export function PdfUploader() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState<string>("");

	const handleFile = useCallback((selectedFile: File) => {
		setError(null);

		if (selectedFile.type !== "application/pdf") {
			setError("Please select a PDF file");
			return;
		}

		if (selectedFile.size > 50 * 1024 * 1024) {
			setError("File size must be less than 50MB");
			return;
		}

		setFile(selectedFile);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);

			const droppedFile = e.dataTransfer.files[0];
			if (droppedFile) {
				handleFile(droppedFile);
			}
		},
		[handleFile]
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			handleFile(selectedFile);
		}
	};

	const handleUpload = async () => {
		if (!file) return;

		setIsUploading(true);
		setError(null);

		try {
			setProgress("Uploading...");
			const formData = new FormData();
			formData.append("file", file);

			const res = await fetch("/api/pdf", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				const msg = data?.error?.message ?? "Upload failed";
				throw new Error(msg);
			}

			router.push("/dashboard");
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setIsUploading(false);
			setProgress("");
		}
	};

	return (
		<div className="max-w-xl mx-auto">
			<Card
				className={`p-8 border-2 border-dashed transition-colors ${
					isDragging ? "border-accent bg-bg-input" : "border-border-strong hover:border-accent"
				}`}
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
			>
				{file ? (
					<div className="text-center">
						<div className="flex items-center justify-center gap-3 mb-4">
							<FileText className="w-10 h-10 text-gray-400" />
							<div className="text-left">
								<p className="font-medium text-white truncate max-w-xs">{file.name}</p>
								<p className="text-sm text-gray-400">{formatBytes(file.size)}</p>
							</div>
							<button
								type="button"
								onClick={() => setFile(null)}
								className="p-1 hover:bg-white/10 rounded"
								disabled={isUploading}
							>
								<X className="w-5 h-5 text-gray-400" />
							</button>
						</div>

						{error && <p className="text-red-400 text-sm mb-4">{error}</p>}

						{progress && (
							<p className="text-gray-400 text-sm mb-4 flex items-center justify-center gap-2">
								<Loader2 className="w-4 h-4 animate-spin" />
								{progress}
							</p>
						)}

						<Button onClick={handleUpload} disabled={isUploading}>
							{isUploading ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Uploading...
								</>
							) : (
								<>
									<Upload className="w-4 h-4 mr-2" />
									Upload PDF
								</>
							)}
						</Button>
					</div>
				) : (
					<label className="block text-center cursor-pointer">
						<Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
						<p className="text-white font-medium mb-1">Drop your PDF here or click to browse</p>
						<p className="text-sm text-gray-400">Maximum file size: 50MB</p>
						<input
							type="file"
							accept="application/pdf"
							onChange={handleChange}
							className="hidden"
						/>
					</label>
				)}

				{error && !file && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
			</Card>
		</div>
	);
}
