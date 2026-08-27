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
    if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      return Response.json({ error: "Incomplete payment confirmation" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Razorpay server keys are not configured");
    const expected = createHmac("sha256", secret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest("hex");
    if (!signaturesMatch(body.razorpay_signature, expected)) {
      return Response.json({ error: "Payment signature is invalid" }, { status: 400 });
    }

    const { data: order, error } = await service
      .from("payment_orders")
      .select("id,user_id,plan_id,status")
      .eq("provider_order_id", body.razorpay_order_id)
      .eq("user_id", user.id)
      .single();
    if (error || !order) return Response.json({ error: "Payment order was not found" }, { status: 404 });
    if (order.status === "paid") return Response.json({ ok: true });

    const paidAt = new Date();
    const endsAt = new Date(paidAt);
    endsAt.setMonth(endsAt.getMonth() + 1);
    await service.from("payment_orders").update({
      status: "paid",
      provider_payment_id: body.razorpay_payment_id,
      paid_at: paidAt.toISOString(),
    }).eq("id", order.id);
    const { error: subscriptionError } = await service.from("user_subscriptions").upsert({
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
