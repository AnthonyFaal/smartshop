import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export interface InitiatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, string>;
}

export interface InitiatePaymentResult {
  providerRef: string;
  status: PaymentStatus;
  redirectUrl?: string;
  accessCode?: string;
  providerData?: Record<string, unknown>;
}

export interface PaymentWebhookPayload {
  providerRef: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verifyWebhook(
    payload: string,
    signature: string
  ): Promise<PaymentWebhookPayload>;
  refund(
    providerRef: string,
    amount: number
  ): Promise<{ success: boolean; refundRef?: string }>;
}

class MockPaymentProvider implements PaymentProvider {
  name = "mock";

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return {
      providerRef: `mock_${input.orderId}_${Date.now()}`,
      status: "COMPLETED",
      providerData: { mock: true },
    };
  }

  async verifyWebhook(
    payload: string,
    _signature: string
  ): Promise<PaymentWebhookPayload> {
    const data = JSON.parse(payload) as PaymentWebhookPayload;
    return data;
  }

  async refund(providerRef: string, amount: number) {
    return { success: true, refundRef: `refund_${providerRef}_${amount}` };
  }
}

import { PaystackPaymentProvider } from "@/lib/payments/paystack";

const providers: Record<string, PaymentProvider> = {
  mock: new MockPaymentProvider(),
  paystack: new PaystackPaymentProvider(),
};

export function getPaymentProvider(name?: string): PaymentProvider {
  const providerName = name ?? process.env.PAYMENT_PROVIDER ?? "mock";
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Payment provider "${providerName}" not found`);
  }
  return provider;
}

export function registerPaymentProvider(
  name: string,
  provider: PaymentProvider
): void {
  providers[name] = provider;
}
