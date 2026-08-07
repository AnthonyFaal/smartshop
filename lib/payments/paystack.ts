import type { PaymentStatus } from "@prisma/client";

import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  PaymentWebhookPayload,
} from "@/lib/payments/provider";

const PAYSTACK_CURRENCY = "GHS";

function mapPaymentStatus(status: string): PaymentStatus {
  // Paystack uses: success/failed
  if (status === "success") return "COMPLETED";
  if (status === "failed") return "FAILED";
  return "PENDING";
}

export class PaystackPaymentProvider implements PaymentProvider {
  name = "paystack";

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("Missing PAYSTACK_SECRET_KEY");

    // Paystack amount is in kobo (integer)
    const amountKobo = Math.round(input.amount * 100);

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountKobo,
        email: input.customerEmail,
        reference: `SS_${input.orderId}_${Date.now()}`,
        callback_url:
          process.env.PAYSTACK_CALLBACK_URL ??
          `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/checkout`,
        channels: input.method === "CARD" ? ["card"] : ["mobile_money"],
        metadata: {
          ...input.metadata,
          phone: input.customerPhone,
        },
      }),
    });

    const body = (await res.json()) as {
      status: boolean;
      message?: string;
      data?: {
        reference?: string;
        access_code?: string;
        authorization?: { url?: string };
      };
    };

    if (!res.ok || !body?.status || !body?.data?.reference) {
      throw new Error(body?.message ?? "Paystack initialization failed");
    }

    const providerRef = body.data.reference;

    return {
      providerRef,
      status: "PENDING",
      redirectUrl: body.data.authorization?.url,
      accessCode: body.data.access_code,
      providerData: {
        raw: body.data,
      },
    };
  }

  async verifyWebhook(
    payload: string,
    signature: string
  ): Promise<PaymentWebhookPayload> {
    // Webhook verification is handled in the route handler.
    void signature;
    const data = JSON.parse(payload) as {
      data?: {
        reference?: string;
        access_code?: string;
        status?: string;
        amount?: number;
        currency?: string;
        metadata?: Record<string, unknown>;
      };
      providerRef?: string;
      amount?: number;
      currency?: string;
    };

    return {
      providerRef: data.data?.reference ?? data.providerRef ?? "",
      status: mapPaymentStatus(data.data?.status ?? ""),
      amount: data.data?.amount ?? data.amount ?? 0,
      currency: data.data?.currency ?? data.currency ?? PAYSTACK_CURRENCY,
      metadata: data.data?.metadata,
    };
  }

  async refund(
    providerRef: string,
    amount: number
  ): Promise<{ success: boolean; refundRef?: string }> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("Missing PAYSTACK_SECRET_KEY");

    const amountKobo = Math.round(amount * 100);

    const res = await fetch(
      `https://api.paystack.co/refund/${encodeURIComponent(providerRef)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountKobo,
        }),
      }
    );

    const body = await res.json();
    const success = !!body?.status;
    const refundRef = body?.data?.reference;

    return { success, refundRef };
  }
}

