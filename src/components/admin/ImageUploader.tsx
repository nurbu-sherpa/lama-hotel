"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils/format";

const MAX = 5 * 1024 * 1024;
// image/jpg and image/pjpeg: non-standard JPEG types some phones / older browsers report.
const TYPES = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"];

/**
 * File input with drag & drop, instant preview, a remove button and client-side checks
 * (type + 5 MB limit). The server re-validates everything (magic bytes, size) — this is just for a friendly UX.
 */
export function ImageUploader({ name = "file", label = "Image", required = false, currentUrl, hint }: { name?: string; label?: string; required?: boolean; currentUrl?: string; hint?: string }) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // Clear the preview when the surrounding form is reset (e.g. after a successful upload).
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => setPreview(null);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  /** Validate the chosen/dropped file; on failure clear the input so an invalid file is never submitted. */
  const accept = (f: File | undefined) => {
    setError(null);
    const input = inputRef.current;
    if (!f) return setPreview(null);
    if (!TYPES.includes(f.type)) {
      setError("Only JPEG (.jpg / .jpeg), PNG and WebP images are allowed.");
      if (input) input.value = "";
      return setPreview(null);
    }
    if (f.size > MAX) {
      setError("Image is too large. Maximum size is 5 MB.");
      if (input) input.value = "";
      return setPreview(null);
    }
    setPreview(URL.createObjectURL(f));
  };

  const remove = () => {
    if (inputRef.current) inputRef.current.value = "";
    setError(null);
    setPreview(null);
  };

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="relative">
        <label
          htmlFor={id}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            const input = inputRef.current;
            if (!f || !input) return;
            // Put the dropped file into the real <input> so the form submits it like a picked file.
            const dt = new DataTransfer();
            dt.items.add(f);
            input.files = dt.files;
            accept(f);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center text-sm text-muted transition-all duration-200 focus-within:border-forest-500",
            dragging
              ? "scale-[1.01] border-clay-500 bg-clay-50 shadow-[0_0_0_4px_rgb(214_162_61/0.25),0_0_32px_rgb(214_162_61/0.45)]"
              : "border-cream-300 bg-cream-50 hover:border-forest-300",
          )}
        >
          {dragging ? (
            <UploadCloud size={36} className="animate-bounce text-clay-600" aria-hidden />
          ) : preview || currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img src={preview ?? currentUrl} alt="Selected image preview" className="max-h-48 rounded-lg object-contain" />
          ) : (
            <ImagePlus size={32} className="text-forest-300" aria-hidden />
          )}
          <span className={cn("font-medium", dragging ? "text-clay-700" : "text-forest-800")}>
            {dragging ? "Drop your image here" : preview ? "Change image" : currentUrl ? "Replace image" : "Choose an image or drag it here"}
          </span>
          <span className="text-xs">JPEG (.jpg / .jpeg), PNG or WebP · max 5 MB</span>
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            required={required}
            className="sr-only"
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </label>
        {/* Outside the <label>, so clicking it doesn't open the file picker. */}
        {preview && !dragging && (
          <button
            type="button"
            onClick={remove}
            aria-label="Remove selected image"
            className="absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-md ring-1 ring-cream-300 transition hover:scale-105 hover:bg-red-50 hover:text-red-700 active:scale-95"
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
