import { PdfUploader } from "@/components/pdf/pdf-uploader";

export default function UploadPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload PDF</h1>
        <p className="text-gray-600 mt-1">
          Upload a PDF to transform it into an interactive flipbook
        </p>
      </div>

      <PdfUploader />
    </div>
  );
}
