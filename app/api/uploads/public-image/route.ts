import { NextResponse } from "next/server";
import { z } from "zod";
import { uploadPublicImage, deleteFile, getBucketForFileType } from "@/lib/storage/s3";
import { env } from "@/lib/config/env";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

export const runtime = "nodejs";

const uploadSchema = z.object({
  pathPrefix: z.string().min(1).max(200),
  bucketType: z.enum(["product", "avatar"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const limit = await checkRateLimit(user.id, "public-upload", 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many uploads. Please try again shortly." }, { status: 429 });
  const formData = await req.formData();

  const file = formData.get("file");
  const pathPrefixRaw = formData.get("pathPrefix");
  const bucketTypeRaw = formData.get("bucketType");

  const parsed = uploadSchema.safeParse({
    pathPrefix: typeof pathPrefixRaw === "string" ? pathPrefixRaw : "",
    bucketType: typeof bucketTypeRaw === "string" ? bucketTypeRaw : "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upload parameters" },
      { status: 400 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing file" },
      { status: 400 }
    );
  }

  if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image under 5 MB." }, { status: 400 });
  }
  if (parsed.data.bucketType === "product" && !["SELLER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Seller access required" }, { status: 403 });
  }

  try {
    const bucket = parsed.data.bucketType
      ? getBucketForFileType(parsed.data.bucketType)
      : env.S3_BUCKET_UPLOADS;

    const { publicUrl, storageKey } = await uploadPublicImage({
      bucket,
      pathPrefix: parsed.data.pathPrefix ? parsed.data.pathPrefix : `${parsed.data.bucketType}/${user.id}`,
      file,
    });

    return NextResponse.json({ publicUrl, bucket, storageKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

const deleteSchema = z.object({
  bucket: z.string().min(1),
  storageKey: z.string().min(1),
});

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete parameters" }, { status: 400 });
  }

  try {
    await deleteFile(parsed.data.bucket, parsed.data.storageKey);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

