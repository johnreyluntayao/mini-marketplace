"use client";

import { useRef, useState } from "react";
import { Button, Image, ImagePlus, X } from "@/lib/imports";
import { acceptedPhotoTypes, maxPhotoBytes } from "@/lib/listings";
import { cn } from "@/lib/utils";

export type PhotoSelection = { file: File; url: string; uploadId: string };

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)), { once: true });
    reader.addEventListener("error", () => reject(reader.error), { once: true });
    reader.readAsDataURL(file);
  });
}

export function PhotoField({
  imageUrl,
  disabled,
  error,
  onChange,
  onError,
  onBusy,
}: {
  imageUrl: string;
  disabled: boolean;
  error?: string;
  onChange: (photo: PhotoSelection | null) => void;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [dragging, setDragging] = useState(false);

  async function selectFile(file: File) {
    const current = ++request.current;

    if (!file.size || !acceptedPhotoTypes.some((type) => type === file.type)) {
      onError("Choose a JPEG, PNG, WebP, AVIF, or GIF image.");
      onBusy(false);
      return;
    }
    if (file.size > maxPhotoBytes) {
      onError("Choose a photo that’s 4 MB or smaller.");
      onBusy(false);
      return;
    }

    onError("");
    onBusy(true);
    try {
      const url = await readImage(file);
      const photo = new window.Image();
      photo.src = url;
      await photo.decode();
      if (current === request.current) onChange({ file, url, uploadId: crypto.randomUUID() });
    } catch {
      if (current === request.current) onError("This photo couldn’t be opened. Try a different one.");
    } finally {
      if (current === request.current) onBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Listing photo</p>
      <div
        className={cn("relative overflow-hidden rounded-xl border border-dashed bg-background", dragging && "border-primary bg-accent", error && "border-destructive")}
        onDragOver={(event) => {
          event.preventDefault();
          if (disabled) return;
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          const file = event.dataTransfer.files[0];
          if (file) void selectFile(file);
        }}
      >
        <input
          ref={input}
          id="listing-photo"
          type="file"
          aria-label="Listing photo file"
          accept={acceptedPhotoTypes.join(",")}
          disabled={disabled}
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void selectFile(file);
          }}
        />
        {imageUrl && (
          <div className="relative mx-auto mt-4 aspect-[1.5] w-11/12 max-w-64 overflow-hidden rounded-lg bg-muted">
            <Image src={imageUrl} alt="Selected listing photo" fill unoptimized className="object-contain" />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Remove photo"
              disabled={disabled}
              className="absolute top-2 right-2 z-10 size-8 rounded-full"
              onClick={() => {
                request.current += 1;
                onBusy(false);
                onError("");
                onChange(null);
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        )}
        <button
          type="button"
          disabled={disabled}
          data-invalid={error ? true : undefined}
          aria-describedby={error ? "photo-error" : "photo-help"}
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl p-4 text-center text-sm font-semibold text-primary-strong focus-visible:-outline-offset-2"
        >
          {!imageUrl && <span className="grid size-10 place-items-center rounded-full bg-accent"><ImagePlus aria-hidden="true" className="size-5" /></span>}
          {imageUrl ? "Replace photo" : "Choose a photo or drag it here"}
        </button>
      </div>
      <p id="photo-help" className="mt-2 text-xs text-muted-foreground">JPEG, PNG, WebP, AVIF, or GIF. Up to 4 MB.</p>
      {error && <p id="photo-error" className="mt-1.5 text-xs font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
}
