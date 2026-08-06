"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";

import { PageShell } from "@/components/layout/page-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

const MAX_SIZE = 7 * 1024 * 1024;
const MIN_WIDTH = 1000;
const MIN_HEIGHT = 600;

async function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject();
    };

    img.src = url;
  });
}

async function checkImage(file: File) {
  if (file.size > MAX_SIZE) {
    throw new Error("Image must be below 7MB.");
  }

  const img = await loadImage(file);

  if (img.naturalWidth < MIN_WIDTH || img.naturalHeight < MIN_HEIGHT) {
    throw new Error("Image quality is too low. Retake closer.");
  }

  const canvas = document.createElement("canvas");
  const scale = 600 / img.naturalWidth;

  canvas.width = 600;
  canvas.height = img.naturalHeight * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing failed.");

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let bright = 0;
  let edges = 0;

  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const light = (r + g + b) / 3;

    if (light > 245) bright++;

    if (Math.abs(r - g) + Math.abs(g - b) > 25) {
      edges++;
    }
  }

  const total = pixels.length / 16;

  if (bright / total > 0.25) {
    throw new Error("Too much glare. Avoid reflections.");
  }

  if (edges / total < 0.04) {
    throw new Error("Image is blurry. Retake clearly.");
  }

  return true;
}

export default function GhanaCardVerifyPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation =
    trpc.auth.sellerVerificationUpsertGhanaCardImage.useMutation();

  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ready = imageUrl.startsWith("http");

  async function upload(file: File) {
    setError("");

    if (!file.type.startsWith("image")) {
      setError("Upload an image file.");
      return;
    }

    try {
      setLoading(true);

      await checkImage(file);

      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/uploads/verification-document", {
        method: "POST",
        body: data,
      });

      if (!res.ok) throw new Error("Image upload failed");

      const json = (await res.json()) as { documentUrl: string };

      setImageUrl(json.documentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid image");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell showVerificationBanner>
      <div className="mx-auto max-w-xl px-5 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Ghana Card Verification</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium">Card Photo</label>

              <div className="mt-2 rounded-xl border border-dashed p-6 text-center">
                {imageUrl ? (
                  <div>
                    <Image
                      src={imageUrl}
                      alt="Uploaded Ghana Card"
                      width={400}
                      height={240}
                      className="mx-auto max-h-60 rounded-lg object-contain"
                    />

                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => inputRef.current?.click()}
                    >
                      Replace image
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => inputRef.current?.click()}
                    disabled={loading}
                  >
                    {loading ? "Checking image..." : "Upload photo"}
                  </Button>
                )}

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                  }}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/seller/verify")}
              >
                Back
              </Button>

              <Button
                disabled={!ready || mutation.isPending}
                onClick={async () => {
                  await mutation.mutateAsync({
                    ghanaCardFrontUrl: imageUrl,
                  });

                  router.push("/seller/verify");
                }}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
