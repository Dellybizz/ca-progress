import { createHmac, timingSafeEqual } from "crypto";
import { requireUser, apiError } from "@/lib/supabase-server-admin";

function signaturesMatch(value: string, expected: string) {
  const left = Buffer.from(value, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  try {
    const { service, user } = await requireUser(request);
    const body = (await request.json()) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };
    if (
      !body.razorpay_order_id ||
      !body.razorpay_payment_id ||
      !body.razorpay_signature
    ) {
      return Response.json(
        { error: "Incomplete payment confirmation" },
        { status: 400 },
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Razorpay server keys are not configured");
    const expected = createHmac("sha256", secret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest("hex");
    if (!signaturesMatch(body.razorpay_signature, expected)) {
      return Response.json(
        { error: "Payment signature is invalid" },
        { status: 400 },
      );
    }

    const { data: order, error } = await service
      .from("payment_orders")
      .select("id,user_id,plan_id,status")
      .eq("provider_order_id", body.razorpay_order_id)
      .eq("user_id", user.id)
      .single();
    if (error || !order)
      return Response.json(
        { error: "Payment order was not found" },
        { status: 404 },
      );
    if (order.status === "paid") return Response.json({ ok: true });

    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) throw new Error("Razorpay server keys are not configured");
    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(body.razorpay_payment_id)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
        },
        cache: "no-store",
      },
    );
    const payment = (await paymentResponse.json()) as {
      order_id?: string;
      amount?: number;
      currency?: string;
      status?: string;
      captured?: boolean;
      error?: { description?: string };
    };
    if (!paymentResponse.ok)
      throw new Error(
        payment.error?.description || "Could not verify payment with Razorpay",
      );
    if (
      payment.order_id !== body.razorpay_order_id ||
      payment.status !== "captured" ||
      payment.captured !== true
    ) {
      return Response.json(
        { error: "Payment has not been captured" },
        { status: 400 },
      );
    }

    const { data: fullOrder } = await service
      .from("payment_orders")
      .select("amount_paise,currency")
      .eq("id", order.id)
      .single();
    if (
      !fullOrder ||
      payment.amount !== fullOrder.amount_paise ||
      payment.currency !== fullOrder.currency
    ) {
      return Response.json(
        { error: "Payment amount does not match the selected plan" },
        { status: 400 },
      );
    }

    const paidAt = new Date();
    const endsAt = new Date(paidAt);
    endsAt.setMonth(endsAt.getMonth() + 1);
    await service
      .from("payment_orders")
      .update({
        status: "paid",
        provider_payment_id: body.razorpay_payment_id,
        paid_at: paidAt.toISOString(),
      })
      .eq("id", order.id);
    const { error: subscriptionError } = await service
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        plan_id: order.plan_id,
        status: "active",
        starts_at: paidAt.toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: paidAt.toISOString(),
      });
    if (subscriptionError) throw subscriptionError;
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
