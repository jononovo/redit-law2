import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

export async function getOrCreateCustomer(email: string, uid: string): Promise<string> {
  const existing = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { firebase_uid: uid },
  });

  return customer.id;
}

export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });
}

export async function chargeCustomer(
  customerId: string,
  paymentMethodId: string,
  amountCents: number,
  description: string,
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    customer: customerId,
    payment_method: paymentMethodId,
    amount: amountCents,
    currency: "usd",
    description,
    confirm: true,
    off_session: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });
}

export async function getPaymentMethodDetails(pmId: string): Promise<{
  last4: string | null;
  brand: string | null;
}> {
  const pm = await stripe.paymentMethods.retrieve(pmId);
  return {
    last4: pm.card?.last4 || null,
    brand: pm.card?.brand || null,
  };
}

export async function detachPaymentMethod(pmId: string): Promise<void> {
  await stripe.paymentMethods.detach(pmId);
}
