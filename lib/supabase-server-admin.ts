import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function bearerToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

export async function requireUser(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const service = createServiceClient();
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return { service, user: data.user };
}

export async function requireAdmin(request: Request) {
  const result = await requireUser(request);
  const { data } = await result.service
    .from("admin_users")
    .select("role")
    .eq("user_id", result.user.id)
    .maybeSingle();
  if (!data?.role) throw new Error("FORBIDDEN");
  return { ...result, role: data.role as string };
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  return Response.json({ error: message }, { status });
}

