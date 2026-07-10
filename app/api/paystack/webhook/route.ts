import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";

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

    if (!paystackSignature || hash !== paystackSignature) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      data: {
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

    const isSuccess = payload?.data?.status === "success";

    if (isSuccess) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
            providerData: payload as any,
          },
        });

        // Confirm order only once
        await tx.order.updateMany({
          where: { id: payment.orderId, status: { in: ["PENDING"] } },
          data: { status: "CONFIRMED" },
        });
      });
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          providerData: payload as any,
          failureReason: "Paystack reported failure",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Unknown" },
      { status: 500 }
    );
  }
}

