import { requireUser, apiError } from "@/lib/supabase-server-admin";

export async function POST(request: Request) {
  try {
    const { service, user } = await requireUser(request);
    const { planId } = (await request.json()) as { planId?: string };
    if (!planId) return Response.json({ error: "Choose a subscription plan" }, { status: 400 });

    const { data: plan, error } = await service
      .from("subscription_plans")
      .select("id,slug,name,price_monthly,active")
      .eq("id", planId)
      .single();
    if (error || !plan || !plan.active) {
      return Response.json({ error: "This plan is unavailable" }, { status: 400 });
    }

    const amount = Math.round(Number(plan.price_monthly) * 100);
    if (amount < 100) {
      return Response.json({ error: "Set a valid paid price in the admin panel first" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay server keys are not configured");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `ca_${Date.now()}_${user.id.slice(0, 8)}`,
        notes: { user_id: user.id, plan_id: plan.id, plan_slug: plan.slug },
      }),
    });
    const order = (await response.json()) as { id?: string; error?: { description?: string } };
    if (!response.ok || !order.id) throw new Error(order.error?.description || "Could not create payment order");

    const { error: saveError } = await service.from("payment_orders").insert({
      user_id: user.id,
      plan_id: plan.id,
      provider_order_id: order.id,
      amount_paise: amount,
      currency: "INR",
    });
    if (saveError) throw saveError;

    return Response.json({ orderId: order.id, amount, currency: "INR", planName: plan.name, keyId });
  } catch (error) {
    return apiError(error);
  }
}

