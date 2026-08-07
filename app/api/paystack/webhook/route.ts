import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";
import { settlePayment } from "@/server/services/order.service";

// Paystack sends webhook payloads with content-type application/json
// and X-Paystack-Signature header.



function getRawBody(req: Request): Promise<string> {
  // Next.js route handlers allow reading the body as text.
  return req.text();
}

export async function POST(req: Request) {
  try {
    const rawBody = await getRawBody(req);

    const paystackSignature = req.headers.get("x-paystack-signature") ?? "";
    const expectedSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!expectedSecret) {
      throw Errors.badRequest("Missing PAYSTACK_WEBHOOK_SECRET");
    }


    const hash = crypto
      .createHmac("sha512", expectedSecret)
      .update(rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(paystackSignature, "utf8");
    const hashBuffer = Buffer.from(hash, "utf8");
    if (
      signatureBuffer.length !== hashBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, hashBuffer)
    ) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        reference?: string;
        status?: string;
        amount?: number;
        currency?: string;
      };
    };

    const reference = payload?.data?.reference;
    if (!reference) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { providerRef: reference },
      include: { order: true },
    });

    if (!payment) {
      // Idempotency: Paystack can retry.
      return NextResponse.json({ ok: true });
    }

    const providerStatus = payload?.data?.status;
    const isSuccess = providerStatus === "success";
    const isFailure = providerStatus === "failed" || providerStatus === "abandoned";
    if (!isSuccess && !isFailure) {
      return NextResponse.json({ ok: true });
    }

    const amountInGhs = Number(payload.data?.amount ?? 0) / 100;
    const expectedAmount = Number(payment.amount);
    const currency = payload.data?.currency ?? "GHS";
    if (
      currency !== payment.order.currency ||
      !Number.isFinite(amountInGhs) ||
      Math.round(amountInGhs * 100) !== Math.round(expectedAmount * 100)
    ) {
      return NextResponse.json({ ok: false, message: "Payment mismatch" }, { status: 400 });
    }

    await settlePayment(
      reference,
      isSuccess,
      payload as unknown as import("@prisma/client").Prisma.InputJsonValue,
      isFailure ? `Paystack reported ${providerStatus}` : undefined
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Unknown" },
      { status: 500 }
    );
  }
}

