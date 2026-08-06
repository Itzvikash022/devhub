import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PRESIGNED_URL_EXPIRY_SECONDS } from "@/constants/app.constants";
import { Readable } from "stream";

const ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
  throw new Error("Cloudflare R2 environment variables are not fully configured.");
}

// Cloudflare R2 uses an S3-compatible endpoint
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

let corsConfigured = false;

/**
 * Automatically configures standard CORS rules on the R2 bucket to prevent preflight blocks.
 */
export async function ensureBucketCors(): Promise<void> {
  if (corsConfigured) return;
  try {
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });
    await r2Client.send(command);
    corsConfigured = true;
    console.log("Cloudflare R2 CORS configured successfully.");
  } catch (error) {
    console.error("Failed to automatically configure R2 CORS:", error);
  }
}

/**
 * Generates a presigned PUT URL that the client uses to upload directly to R2.
 * This bypasses the Next.js server for large files.
 */
export async function generatePresignedUploadUrl(key: string, mimeType: string): Promise<string> {
  await ensureBucketCors();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  return getSignedUrl(r2Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  });
}

export async function generatePresignedDownloadUrl(key: string, filename?: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: filename ? `attachment; filename="${encodeURIComponent(filename)}"` : undefined,
  });

  return getSignedUrl(r2Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  });
}

/**
 * Permanently deletes an object from R2 storage.
 * Called when an image or document is deleted from DevHub.
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Fetches an object directly from Cloudflare R2.
 * Returns a Buffer of the file contents.
 */
export async function getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  if (!response.Body) {
    throw new Error("EMPTY_R2_OBJECT");
  }

  const stream = response.Body as Readable;
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
}

/**
 * Writes an object directly to Cloudflare R2.
 */
export async function putObject(
  key: string,
  body: Buffer | string,
  mimeType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: mimeType,
  });

  await r2Client.send(command);
}

/**
 * Generates a public URL for an R2 object (when using a public bucket or CDN).
 * Used for images that don't need access control.
 */
export function getPublicUrl(key: string): string {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!publicUrl) throw new Error("CLOUDFLARE_R2_PUBLIC_URL is not configured.");
  return `${publicUrl}/${key}`;
}
