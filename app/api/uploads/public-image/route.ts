import { NextResponse } from "next/server";
import { z } from "zod";
import { uploadPublicImage, getBucketForFileType } from "@/lib/storage/s3";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";

const uploadSchema = z.object({
  pathPrefix: z.string().min(1).max(200),
  bucketType: z.enum(["product", "avatar", "document"]).optional(),
});

export async function POST(req: Request) {
  const formData = await req.formData();

  const file = formData.get("file");
  const pathPrefixRaw = formData.get("pathPrefix");
  const bucketTypeRaw = formData.get("bucketType");

  const parsed = uploadSchema.safeParse({
    pathPrefix: typeof pathPrefixRaw === "string" ? pathPrefixRaw : "",
    bucketType: typeof bucketTypeRaw === "string" ? bucketTypeRaw : undefined,
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

  try {
    const bucket = parsed.data.bucketType
      ? getBucketForFileType(parsed.data.bucketType)
      : env.S3_BUCKET_UPLOADS;

    const { publicUrl } = await uploadPublicImage({
      bucket,
      pathPrefix: parsed.data.pathPrefix,
      file,
    });

    return NextResponse.json({ publicUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}

