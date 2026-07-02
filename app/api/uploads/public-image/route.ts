import { NextResponse } from "next/server";
import { z } from "zod";
import { uploadPublicImage } from "@/lib/storage/s3";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";

const uploadSchema = z.object({
  pathPrefix: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const formData = await req.formData();

  const file = formData.get("file");
  const pathPrefixRaw = formData.get("pathPrefix");

  const parsed = uploadSchema.safeParse({
    pathPrefix: typeof pathPrefixRaw === "string" ? pathPrefixRaw : "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid pathPrefix" },
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
    const { publicUrl } = await uploadPublicImage({
      bucket: env.S3_BUCKET_UPLOADS,
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

