"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils";

type PDFJSLib = typeof import("pdfjs-dist");

export function PdfUploader() {
  const router = useRouter();
  const pdfjsRef = useRef<PDFJSLib | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const loadPdfjs = async (): Promise<PDFJSLib> => {
    if (pdfjsRef.current) return pdfjsRef.current;

    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfjsRef.current = pdfjs;
    return pdfjs;
  };

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
    [handleFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const getPageCount = async (file: File): Promise<number> => {
    const pdfjs = await loadPdfjs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      setProgress("Analyzing PDF...");
      const pageCount = await getPageCount(file);

      setProgress("Uploading...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pageCount", pageCount.toString());

      const res = await fetch("/api/pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
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
          isDragging
            ? "border-gray-500 bg-[#333]"
            : "border-[#404040] hover:border-gray-500"
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
                <p className="font-medium text-white truncate max-w-xs">
                  {file.name}
                </p>
                <p className="text-sm text-gray-400">
                  {formatBytes(file.size)}
                </p>
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
            <p className="text-white font-medium mb-1">
              Drop your PDF here or click to browse
            </p>
            <p className="text-sm text-gray-400">Maximum file size: 50MB</p>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleChange}
              className="hidden"
            />
          </label>
        )}

        {error && !file && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}
      </Card>
    </div>
  );
}
