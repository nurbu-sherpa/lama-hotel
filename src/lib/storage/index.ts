import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import { MAX_UPLOAD_BYTES } from "@/config/site";

/**
 * Image storage.
 *  - Cloudinary when CLOUDINARY_* env vars are set (required on Vercel).
 *  - Otherwise local disk (./uploads, served by /uploads/[name]) for development / self-hosting.
 */

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
type AllowedMime = keyof typeof ALLOWED;

function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function storageMode(): "cloudinary" | "local" | "unconfigured" {
  if (cloudinaryConfigured()) return "cloudinary";
  // Vercel's filesystem is read-only/ephemeral — local storage would silently lose files.
  if (process.env.VERCEL) return "unconfigured";
  return "local";
}

/** Detect the real file type from magic bytes — never trust the browser-supplied MIME type. */
function sniffMime(buf: Buffer): AllowedMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export class UploadError extends Error {}

async function validateImageFile(file: unknown): Promise<{ buffer: Buffer; mime: AllowedMime }> {
  if (!(file instanceof File) || file.size === 0) throw new UploadError("Please choose an image to upload.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Image is too large. Maximum size is 5 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buffer);
  if (!mime) throw new UploadError("Only JPEG (.jpg / .jpeg), PNG and WebP images are allowed.");
  return { buffer: await stripMetadata(buffer, mime), mime };
}

/**
 * Re-encode the photo: applies the EXIF orientation (so it isn't shown sideways), then drops all
 * metadata — GPS location, camera, date — keeping only the colour profile. Re-encoding also removes
 * anything smuggled inside a file that merely looks like an image.
 */
async function stripMetadata(buffer: Buffer, mime: AllowedMime) {
  try {
    const img = sharp(buffer, { failOn: "error", limitInputPixels: 50_000_000 }).rotate().keepIccProfile();
    if (mime === "image/png") return await img.png({ compressionLevel: 9 }).toBuffer();
    if (mime === "image/webp") return await img.webp({ quality: 90 }).toBuffer();
    return await img.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  } catch {
    throw new UploadError("This image couldn't be read. Please try a different JPEG, PNG or WebP file.");
  }
}

export async function uploadImage(file: unknown, folder: "gallery" | "rooms" | "pages"): Promise<{ url: string; storageKey: string }> {
  const { buffer, mime } = await validateImageFile(file);
  const mode = storageMode();

  if (mode === "unconfigured") {
    throw new UploadError("Image storage is not configured. Please set the Cloudinary environment variables.");
  }

  if (mode === "cloudinary") {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `lama-hotel/${folder}`, resource_type: "image", overwrite: false },
        (err, res) => (err || !res ? reject(err ?? new Error("Upload failed")) : resolve(res)),
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, storageKey: `cloudinary:${result.public_id}` };
  }

  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const name = `${folder}-${randomUUID()}.${ALLOWED[mime]}`;
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), buffer);
  return { url: `/uploads/${name}`, storageKey: `local:${name}` };
}

/** Best effort — a failed delete never blocks removing the database record. */
export async function deleteStoredImage(storageKey: string) {
  try {
    if (storageKey.startsWith("cloudinary:") && cloudinaryConfigured()) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      await cloudinary.uploader.destroy(storageKey.slice("cloudinary:".length));
    } else if (storageKey.startsWith("local:")) {
      const name = storageKey.slice("local:".length);
      if (/^[a-z]+-[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) {
        await unlink(path.join(LOCAL_UPLOAD_DIR, name));
      }
    }
  } catch (err) {
    console.error("Image delete failed", err);
  }
}
