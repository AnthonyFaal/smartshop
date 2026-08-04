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

export interface UploadPublicImageInput {
  bucket: string;
  pathPrefix: string; // e.g. "ghana-card" or "seller-verification/selfie"
  file: File | Buffer;
  filename?: string; // optional for File/Buffer; for File we infer extension
  mimeType?: string; // optional override
}

function getFileInfo(input: UploadPublicImageInput): {
  ext: string;
  mimeType: string;
} {
  if (input.mimeType) {
    return {
      ext: (input.filename?.split(".").pop() ?? "jpg").toLowerCase(),
      mimeType: input.mimeType,
    };
  }

  if (typeof File !== "undefined" && input.file instanceof File) {
    const mimeType = input.file.type || "image/jpeg";
    const ext =
      (input.filename?.split(".").pop() ?? input.file.name.split(".").pop() ?? "jpg").toLowerCase();
    return { ext, mimeType };
  }

  return { ext: "jpg", mimeType: "image/jpeg" };
}

function toUint8Array(data: Buffer | ArrayBuffer): Uint8Array {
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

export async function uploadPublicImage(
  input: UploadPublicImageInput
): Promise<{ publicUrl: string; storageKey: string; }> {
  const client = getS3Client();

  const { ext, mimeType } = getFileInfo(input);
  const safePrefix = input.pathPrefix.replace(/^\/+|\/+$/g, "");
  const id = nanoid();
  const finalFilename = input.filename
    ? input.filename
    : `${id}.${ext}`;
  const storageKey = `${safePrefix}/${finalFilename}`;

  let body: Buffer;
  if (typeof File !== "undefined" && input.file instanceof File) {
    const arrayBuffer = await input.file.arrayBuffer();
    body = Buffer.from(arrayBuffer);
  } else {
    if (Buffer.isBuffer(input.file)) {
      body = input.file;
    } else if (typeof input.file === "object" && "arrayBuffer" in input.file) {
      body = Buffer.from(await input.file.arrayBuffer());
    } else {
      body = Buffer.from(input.file as unknown as Uint8Array);
    }
  }

  await client.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: storageKey,
      ContentType: mimeType,
      Body: body,
    })
  );

  const publicUrl = `${env.S3_PUBLIC_URL}/${input.bucket}/${storageKey}`;
  return { publicUrl, storageKey };
}

export async function uploadPrivateImage(
  input: UploadPublicImageInput
): Promise<{ storageKey: string }> {
  const client = getS3Client();
  const { ext, mimeType } = getFileInfo(input);
  const safePrefix = input.pathPrefix.replace(/^\/+|\/+$/g, "");
  const storageKey = `private/${safePrefix}/${nanoid()}.${ext}`;
  const body = typeof File !== "undefined" && input.file instanceof File
    ? Buffer.from(await input.file.arrayBuffer())
    : Buffer.isBuffer(input.file)
      ? input.file
      : Buffer.from(input.file as unknown as Uint8Array);

  await client.send(new PutObjectCommand({
    Bucket: input.bucket,
    Key: storageKey,
    ContentType: mimeType,
    Body: body,
  }));
  return { storageKey };
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
