import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { getDownloadUrl, uploadPrivateImage } from "@/lib/storage/s3";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const limit = await checkRateLimit(user.id, "verification-upload", 10, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many verification uploads. Please try again later." }, { status: 429 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image under 5 MB." }, { status: 400 });
  }

  const { storageKey } = await uploadPrivateImage({
    bucket: env.S3_BUCKET_UPLOADS,
    pathPrefix: `verification/${user.id}`,
    file,
  });
  const documentUrl = `/api/uploads/verification-document?key=${encodeURIComponent(storageKey)}`;
  return NextResponse.json({ documentUrl });
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const key = new URL(request.url).searchParams.get("key");
  const ownPrefix = `private/verification/${user.id}/`;
  if (!key || (user.role !== "ADMIN" && !key.startsWith(ownPrefix))) {
    return NextResponse.json({ error: "Not authorized to access this document" }, { status: 403 });
  }

  const signedUrl = await getDownloadUrl(env.S3_BUCKET_UPLOADS, key, 300);
  return NextResponse.redirect(signedUrl);
}
