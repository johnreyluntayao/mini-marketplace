import sharp from "sharp";
import { acceptedPhotoTypes, maxPhotoBytes } from "@/lib/listings";
import { ApiError, apiFailure, apiJson, photoBucket, photoPath, requireId } from "@/lib/marketplace-server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { rememberSeller } from "@/lib/seller-browser";

const photoFormats = new Set(["jpeg", "png", "webp", "heif", "gif"]);

async function normalizePhoto(file: File) {
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 });
    const { format } = await image.metadata();
    if (!format || !photoFormats.has(format)) throw new Error("Unsupported image format");
    return await image.autoOrient().resize(1440, 1440, { fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  } catch {
    throw new ApiError(422, "This image couldn’t be opened. Try a different photo.");
  }
}

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > maxPhotoBytes + 64 * 1024) {
      throw new ApiError(413, "Choose a photo that’s 4 MB or smaller.");
    }
    const form = await request.formData().catch(() => null);
    if (!form) throw new ApiError(400, "Send a photo as multipart form data.");

    const uploadId = requireId(form.get("uploadId"), "A valid upload ID is required.");
    const file = form.get("photo");
    if (!(file instanceof File) || file.size === 0) throw new ApiError(400, "Choose a photo to upload.");
    if (file.size > maxPhotoBytes) throw new ApiError(413, "Choose a photo that’s 4 MB or smaller.");
    if (!acceptedPhotoTypes.some((type) => type === file.type)) {
      throw new ApiError(415, "Choose a JPEG, PNG, WebP, AVIF, or GIF photo.");
    }

    const bucket = createSupabaseServerClient().storage.from(photoBucket);
    const fullPath = photoPath(uploadId);
    const thumbPath = photoPath(uploadId, true);

    async function store(path: string, image: Buffer) {
      const upload = await bucket.upload(path, image, { contentType: "image/webp", cacheControl: "3600", upsert: false });
      if (!upload.error) return true;
      const existing = await bucket.exists(path);
      if (!existing.error && existing.data) return false;
      throw upload.error;
    }

    let photo = await normalizePhoto(file);
    const savedFullPhoto = await store(fullPath, photo);

    if (!savedFullPhoto) {
      const savedThumbnail = await bucket.exists(thumbPath);
      if (savedThumbnail.data) return rememberSeller(request, apiJson({ uploadId }));

      // A partially completed upload may already have won the full-size object path.
      const storedPhoto = await bucket.download(fullPath);
      if (storedPhoto.error) throw storedPhoto.error;
      photo = Buffer.from(await storedPhoto.data.arrayBuffer());
    }

    const thumbnail = await sharp(photo).resize(480, 480, { fit: "inside", withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
    const savedThumbnail = await store(thumbPath, thumbnail);
    return rememberSeller(request, apiJson({ uploadId }, savedFullPhoto || savedThumbnail ? 201 : 200));
  } catch (error) {
    return apiFailure(error, "Couldn’t upload the photo. Please try again.");
  }
}
