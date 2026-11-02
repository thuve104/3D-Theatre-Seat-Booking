import Stripe from "stripe";
import crypto from "crypto";

export interface PaymentIntentResult {
  provider: "STRIPE" | "STRIPE_SANDBOX";
  providerPaymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface PaymentProviderAdapter {
  createPaymentIntent(params: {
    bookingId: string;
    amount: number;
    currency: string;
    customerEmail: string;
  }): Promise<PaymentIntentResult>;
  verifyAndConfirmPayment(params: {
    providerPaymentId: string;
    simulateOutcome?: "SUCCEEDED" | "FAILED" | "CANCELLED";
  }): Promise<"SUCCEEDED" | "FAILED" | "CANCELLED">;
  refundPayment(providerPaymentId: string, amount?: number): Promise<{ refundId: string }>;
}

export class ConfigurableStripeAdapter implements PaymentProviderAdapter {
  private stripe: Stripe | null = null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key && key.startsWith("sk_live_") || (key && key.startsWith("sk_test_") && !key.includes("mock"))) {
      this.stripe = new Stripe(key);
    }
  }

  async createPaymentIntent(params: {
    bookingId: string;
    amount: number;
    currency: string;
    customerEmail: string;
  }): Promise<PaymentIntentResult> {
    if (this.stripe) {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        receipt_email: params.customerEmail,
        metadata: { bookingId: params.bookingId },
        automatic_payment_methods: { enabled: true },
      });

      return {
        provider: "STRIPE",
        providerPaymentId: intent.id,
        clientSecret: intent.client_secret!,
        amount: params.amount,
        currency: params.currency,
      };
    }

    // Configurable sandbox mode when real Stripe API keys are not provided in .env
    const pid = `pi_cv_${crypto.randomBytes(10).toString("hex")}`;
    return {
      provider: "STRIPE_SANDBOX",
      providerPaymentId: pid,
      clientSecret: `${pid}_secret_${crypto.randomBytes(8).toString("hex")}`,
      amount: params.amount,
      currency: params.currency,
    };
  }

  async verifyAndConfirmPayment(params: {
    providerPaymentId: string;
    simulateOutcome?: "SUCCEEDED" | "FAILED" | "CANCELLED";
  }): Promise<"SUCCEEDED" | "FAILED" | "CANCELLED"> {
    if (params.simulateOutcome) {
      return params.simulateOutcome;
    }
    if (this.stripe && !params.providerPaymentId.startsWith("pi_cv_")) {
      const intent = await this.stripe.paymentIntents.retrieve(params.providerPaymentId);
      if (intent.status === "succeeded") return "SUCCEEDED";
      if (intent.status === "canceled") return "CANCELLED";
      return "FAILED";
    }
    return "SUCCEEDED";
  }

  async refundPayment(providerPaymentId: string, amount?: number): Promise<{ refundId: string }> {
    if (this.stripe && !providerPaymentId.startsWith("pi_cv_")) {
      const refund = await this.stripe.refunds.create({
        payment_intent: providerPaymentId,
        ...(amount ? { amount: Math.round(amount * 100) } : {}),
      });
      return { refundId: refund.id };
    }
    return { refundId: `re_cv_${crypto.randomBytes(8).toString("hex")}` };
  }
}

export const paymentProvider: PaymentProviderAdapter = new ConfigurableStripeAdapter();
