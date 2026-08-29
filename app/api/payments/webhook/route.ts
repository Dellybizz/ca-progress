import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase-server-admin";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret)
    return Response.json(
      { error: "Webhook is not configured" },
      { status: 500 },
    );

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return Response.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          currency?: string;
          status?: string;
        };
      };
    };
  };
  if (payload.event === "payment.captured") {
    const payment = payload.payload?.payment?.entity;
    if (payment?.order_id && payment.id) {
      const service = createServiceClient();
      const { data: order } = await service
        .from("payment_orders")
        .select("id,user_id,plan_id,status,amount_paise,currency")
        .eq("provider_order_id", payment.order_id)
        .maybeSingle();
      if (
        order &&
        order.status !== "paid" &&
        payment.status === "captured" &&
        payment.amount === order.amount_paise &&
        payment.currency === order.currency
      ) {
        const paidAt = new Date();
        const endsAt = new Date(paidAt);
        endsAt.setMonth(endsAt.getMonth() + 1);
        await service
          .from("payment_orders")
          .update({
            status: "paid",
            provider_payment_id: payment.id,
            paid_at: paidAt.toISOString(),
          })
          .eq("id", order.id);
        await service
          .from("user_subscriptions")
          .upsert({
            user_id: order.user_id,
            plan_id: order.plan_id,
            status: "active",
            starts_at: paidAt.toISOString(),
            ends_at: endsAt.toISOString(),
            updated_at: paidAt.toISOString(),
          });
      }
    }
  }
  if (payload.event === "payment.failed") {
    const payment = payload.payload?.payment?.entity;
    if (payment?.order_id) {
      const service = createServiceClient();
      await service
        .from("payment_orders")
        .update({ status: "failed", provider_payment_id: payment.id || null })
        .eq("provider_order_id", payment.order_id)
        .eq("status", "created");
    }
  }
  return Response.json({ received: true });
}
