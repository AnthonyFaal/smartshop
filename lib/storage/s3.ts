import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/config/env";
import { nanoid } from "nanoid";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 storage is not configured");
    }
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export interface UploadUrlResult {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
}

export async function generateUploadUrl(
  bucket: string,
  filename: string,
  mimeType: string,
  isPublic = false
): Promise<UploadUrlResult> {
  const ext = filename.split(".").pop() ?? "bin";
  const storageKey = `${isPublic ? "public" : "private"}/${nanoid()}.${ext}`;
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const publicUrl = env.S3_PUBLIC_URL
    ? `${env.S3_PUBLIC_URL}/${bucket}/${storageKey}`
    : uploadUrl;

  return { uploadUrl, storageKey, publicUrl };
}

export async function deleteFile(
  bucket: string,
  storageKey: string
): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: storageKey })
  );
}

export async function getDownloadUrl(
  bucket: string,
  storageKey: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: storageKey });
  return getSignedUrl(client, command, { expiresIn });
}

export function getBucketForFileType(
  type: "avatar" | "product" | "document"
): string {
  switch (type) {
    case "avatar":
      return env.S3_BUCKET_AVATARS;
    case "product":
      return env.S3_BUCKET_PRODUCTS;
    case "document":
      return env.S3_BUCKET_UPLOADS;
  }
}
