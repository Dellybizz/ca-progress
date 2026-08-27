import { apiError, requireAdmin } from "@/lib/supabase-server-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { service, role } = await requireAdmin(request);
    if (!['parent_owner','owner','admin'].includes(role)) {
      return Response.json({ error: "Member directory access is restricted" }, { status: 403 });
    }
    const users = [];
    let page = 1;

    while (true) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 1000) break;
      page += 1;
    }

    const ids = users.map((user) => user.id);
    const { data: subscriptions, error: subscriptionError } = ids.length
      ? await service
          .from("user_subscriptions")
          .select("user_id,plan_id,status,starts_at,ends_at,plan:subscription_plans(name,slug,rank)")
          .in("user_id", ids)
      : { data: [], error: null };
    if (subscriptionError) throw subscriptionError;

    const byUser = new Map((subscriptions || []).map((item) => [item.user_id, item]));
    return Response.json({
      members: users.map((user) => ({
        id: user.id,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          "CA Student",
        email: user.email || null,
        phone: user.phone || null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at || null,
        subscription: byUser.get(user.id) || null,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
