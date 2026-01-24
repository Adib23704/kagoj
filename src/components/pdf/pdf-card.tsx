"use client";

import {
  Check,
  Copy,
  Eye,
  FileText,
  Link as LinkIcon,
  Link2Off,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatBytes, formatDate } from "@/lib/utils";

interface ShareLink {
  id: string;
  shareId: string;
  viewCount: number;
  createdAt: Date;
}

interface Pdf {
  id: string;
  name: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  createdAt: Date;
  shareLinks: ShareLink[];
}

interface PdfCardProps {
  pdf: Pdf;
}

export function PdfCard({ pdf }: PdfCardProps) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(pdf.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentShareId, setCurrentShareId] = useState<string | null>(
    pdf.shareLinks[0]?.shareId ?? null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(
    pdf.shareLinks[0]
      ? `${window.location.origin}/view/${pdf.shareLinks[0].shareId}`
      : null,
  );

  const handleRename = async () => {
    if (!newName.trim() || newName === pdf.name) {
      setIsRenaming(false);
      return;
    }

    try {
      const res = await fetch(`/api/pdf/${pdf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to rename:", error);
    }

    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this PDF?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/pdf/${pdf.id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
    setIsDeleting(false);
  };

  const handleShare = async () => {
    setIsShareLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfId: pdf.id }),
      });

      if (res.ok) {
        const { shareUrl, shareLink } = await res.json();
        setShareUrl(shareUrl);
        setCurrentShareId(shareLink.shareId);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create share link:", error);
    }
    setIsShareLoading(false);
  };

  const handleRemoveShareLink = async () => {
    if (!currentShareId) return;
    if (!confirm("Are you sure you want to remove this share link?")) return;

    setIsShareLoading(true);
    try {
      const res = await fetch(`/api/share/${currentShareId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShareUrl(null);
        setCurrentShareId(null);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to remove share link:", error);
    }
    setIsShareLoading(false);
  };

  const handleRegenerateShareLink = async () => {
    if (!confirm("Are you sure you want to regenerate the share link? The old link will stop working.")) return;

    setIsShareLoading(true);
    try {
      // Remove old link first if exists
      if (currentShareId) {
        await fetch(`/api/share/${currentShareId}`, { method: "DELETE" });
      }

      // Create new link
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfId: pdf.id }),
      });

      if (res.ok) {
        const { shareUrl, shareLink } = await res.json();
        setShareUrl(shareUrl);
        setCurrentShareId(shareLink.shareId);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to regenerate share link:", error);
    }
    setIsShareLoading(false);
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleView = () => {
    if (currentShareId) {
      window.open(`/view/${currentShareId}`, "_blank");
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-32 bg-[#333] flex items-center justify-center">
        <FileText className="w-16 h-16 text-gray-500" />
      </div>

      <CardContent className="p-4">
        {isRenaming ? (
          <div className="flex gap-2 mb-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
            />
            <Button size="sm" onClick={handleRename}>
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsRenaming(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <h3 className="font-medium text-white truncate mb-1">{pdf.name}</h3>
        )}

        <div className="text-sm text-gray-400 space-y-1 mb-4">
          <p>{pdf.pageCount} pages</p>
          <p>{formatBytes(pdf.fileSize)}</p>
          <p>{formatDate(pdf.createdAt)}</p>
          {pdf.shareLinks[0] && currentShareId && (
            <p className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {pdf.shareLinks[0].viewCount} views
            </p>
          )}
        </div>

        {/* Share URL display */}
        {shareUrl && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-[#333] rounded">
            <LinkIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-400 truncate flex-1">
              {shareUrl}
            </span>
            <button
              type="button"
              onClick={copyToClipboard}
              className="text-gray-400 hover:text-white"
              title="Copy link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleRegenerateShareLink}
              disabled={isShareLoading}
              className="text-gray-400 hover:text-white disabled:opacity-50"
              title="Regenerate link"
            >
              <RefreshCw className={`w-4 h-4 ${isShareLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleRemoveShareLink}
              disabled={isShareLoading}
              className="text-gray-400 hover:text-red-400 disabled:opacity-50"
              title="Remove link"
            >
              <Link2Off className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {currentShareId && (
            <Button size="sm" variant="secondary" onClick={handleView}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          )}
          {!shareUrl && (
            <Button size="sm" variant="secondary" onClick={handleShare} disabled={isShareLoading}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNewName(pdf.name);
              setIsRenaming(true);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
