"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Crown,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageCircle,
  Save,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import {
  foundationSyllabus,
  intermediateSyllabus,
  finalSyllabus,
} from "@/lib/syllabus";
import PageBuilderStudio from "@/components/admin/PageBuilderStudio";
import FeatureAccessEditor from "@/components/admin/FeatureAccessEditor";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

type Role = "parent_owner" | "owner" | "admin" | "moderator";
type Tab =
  | "overview"
  | "sections"
  | "access"
  | "attempts"
  | "plans"
  | "subscriptions"
  | "admins"
  | "announcements"
  | "chat"
  | "audit";
type Section = {
  id: string;
  section_key: string;
  label: string;
  description: string;
  route: string;
  enabled: boolean;
  audience: "all" | "guest" | "member";
  minimum_plan_rank: number;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  appearance: Record<string, unknown>;
};
type Plan = {
  id: string;
  slug: string;
  name: string;
  rank: number;
  price_monthly: number;
  active: boolean;
};
type Admin = { user_id: string; role: Role; created_at: string };
type Chat = {
  id: string;
  user_id: string;
  display_name: string | null;
  channel: string;
  message: string;
  created_at: string;
};
type Subscription = {
  user_id: string;
  plan_id: string;
  status: "active" | "trialing" | "paused" | "cancelled" | "expired";
  starts_at: string;
  ends_at: string | null;
  plan: { name: string; slug: string } | null;
};
type Audit = {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};
type Member = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  subscription:
    | (Subscription & {
        plan: { name: string; slug: string; rank: number } | null;
      })
    | null;
};
type ModerationPermission = {
  admin_user_id: string;
  permission_type: "chat" | "announcement";
  channel: string;
};
type PageElement = {
  id: string;
  page_key: string;
  element_key: string;
  parent_key: string | null;
  region: string;
  element_type: "section" | "card" | "quick_action" | "content_block";
  label: string;
  description: string;
  enabled: boolean;
  audience: "all" | "guest" | "member";
  minimum_plan_rank: number;
  sort_order: number;
  config: Record<string, unknown>;
  appearance: Record<string, unknown>;
};
type AnnouncementMeta = {
  message_id: string;
  expires_at: string | null;
  created_at: string;
};
type ExamAttempt = {
  id: string;
  attempt_key: string;
  course_level: "Foundation" | "Intermediate" | "Final";
  label: string;
  exam_date: string;
  registration_deadline: string | null;
  enabled: boolean;
  sort_order: number;
  notes: string;
};

const channelSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const courseSubjects = {
  foundation: Object.keys(foundationSyllabus),
  intermediate: Object.keys(intermediateSyllabus),
  final: Object.keys(finalSyllabus),
};
const completeAnnouncementChannels = Object.keys(courseSubjects).map(
  (level) => `${level}-announcements`,
);
const completeChatChannels = [
  "general",
  ...Object.entries(courseSubjects).flatMap(([level, subjects]) => [
    `${level}-resources`,
    `${level}-results`,
    `${level}-talk`,
    ...subjects.map((subject) => `${level}-doubts-${channelSlug(subject)}`),
  ]),
];

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [sections, setSections] = useState<Section[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [messages, setMessages] = useState<Chat[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberError, setMemberError] = useState("");
  const [auditLogs, setAuditLogs] = useState<Audit[]>([]);
  const [permissions, setPermissions] = useState<ModerationPermission[]>([]);
  const [pageElements, setPageElements] = useState<PageElement[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [elementPage, setElementPage] = useState("dashboard");
  const [newElementKey, setNewElementKey] = useState("");
  const [newElementLabel, setNewElementLabel] = useState("");
  const [newElementType, setNewElementType] =
    useState<PageElement["element_type"]>("section");
  const [notice, setNotice] = useState("");
  const [adminUid, setAdminUid] = useState("");
  const [adminRole, setAdminRole] = useState<Role>("moderator");
  const [newParentUid, setNewParentUid] = useState("");
  const [subscriberUid, setSubscriberUid] = useState("");
  const [subscriberPlan, setSubscriberPlan] = useState("");
  const [subscriberStatus, setSubscriberStatus] =
    useState<Subscription["status"]>("active");
  const [subscriberDuration, setSubscriberDuration] = useState("m1");
  const [chatSearch, setChatSearch] = useState("");
  const [chatChannel, setChatChannel] = useState("all");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [announcementChannel, setAnnouncementChannel] = useState("general");
  const [announcement, setAnnouncement] = useState("");
  const [announcementDuration, setAnnouncementDuration] = useState("d7");
  const [announcementMeta, setAnnouncementMeta] = useState<AnnouncementMeta[]>(
    [],
  );
  const [permissionAdmin, setPermissionAdmin] = useState("");
  const [permissionType, setPermissionType] =
    useState<ModerationPermission["permission_type"]>("chat");
  const [permissionChannel, setPermissionChannel] = useState("*");
  const [blockHours, setBlockHours] = useState(1);
  const [logoutPrompt, setLogoutPrompt] = useState(false);
  const [newAttempt, setNewAttempt] = useState({
    attempt_key: "",
    course_level: "Intermediate" as ExamAttempt["course_level"],
    label: "",
    exam_date: "",
    registration_deadline: "",
    notes: "",
  });

  const flash = (value: string) => {
    setNotice(value);
    window.setTimeout(() => setNotice(""), 2200);
  };
  const logAction = async (
    action: string,
    targetType: string,
    targetId?: string,
    details: Record<string, unknown> = {},
  ) => {
    if (!supabase) return;
    await supabase.from("admin_audit_logs").insert({
      actor_id: session?.user.id,
      action,
      target_type: targetType,
      target_id: targetId || null,
      details,
    });
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const { data: admin } = await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        setRole((admin?.role as Role) || null);
      }
      setLoading(false);
    });
  }, []);

  const loadAll = async () => {
    if (!supabase || !role) return;
    const [
      s,
      p,
      a,
      m,
      sub,
      audit,
      permissionData,
      elementsData,
      announcementData,
      attemptData,
    ] = await Promise.all([
      supabase.from("app_sections").select("*").order("sort_order"),
      supabase.from("subscription_plans").select("*").order("rank"),
      supabase
        .from("admin_users")
        .select("user_id,role,created_at")
        .order("created_at"),
      supabase
        .from("community_messages")
        .select("id,user_id,display_name,channel,message,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("user_subscriptions")
        .select(
          "user_id,plan_id,status,starts_at,ends_at,plan:subscription_plans(name,slug)",
        )
        .order("updated_at", { ascending: false }),
      supabase
        .from("admin_audit_logs")
        .select("id,actor_id,action,target_type,target_id,details,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("admin_moderation_permissions")
        .select("admin_user_id,permission_type,channel"),
      supabase.from("app_page_elements").select("*").order("sort_order"),
      supabase
        .from("community_announcements")
        .select("message_id,expires_at,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("exam_attempts")
        .select("*")
        .order("course_level")
        .order("sort_order"),
    ]);
    setSections((s.data || []) as Section[]);
    setPlans((p.data || []) as Plan[]);
    setAdmins((a.data || []) as Admin[]);
    setMessages((m.data || []) as Chat[]);
    setSubscriptions((sub.data || []) as unknown as Subscription[]);
    setAuditLogs((audit.data || []) as Audit[]);
    setPermissions((permissionData.data || []) as ModerationPermission[]);
    setPageElements((elementsData.data || []) as PageElement[]);
    setAnnouncementMeta((announcementData.data || []) as AnnouncementMeta[]);
    setExamAttempts((attemptData.data || []) as ExamAttempt[]);
    if (p.data?.[0] && !subscriberPlan) setSubscriberPlan(p.data[0].id);
  };
  useEffect(() => {
    void loadAll();
  }, [role]);
  useEffect(() => {
    if (!supabase || !role) return;
    const live = supabase
      .channel("admin-live-community")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => {
          const incoming = payload.new as Chat;
          setMessages((all) =>
            all.some((item) => item.id === incoming.id)
              ? all
              : [incoming, ...all].slice(0, 100),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_messages" },
        (payload) => {
          const id = String((payload.old as { id?: string }).id || "");
          if (id) setMessages((all) => all.filter((item) => item.id !== id));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(live);
    };
  }, [role]);

  const loadMembers = async () => {
    if (!session) return;
    setMembersLoading(true);
    setMemberError("");
    try {
      const response = await fetch("/api/admin/members", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = (await response.json()) as {
        members?: Member[];
        error?: string;
      };
      if (response.ok) {
        setMembers(body.members || []);
        return;
      }
      if (!supabase) throw new Error(body.error || "Could not load members");
      const { data, error } = await supabase.rpc("admin_list_members");
      if (error)
        throw new Error(
          `${body.error || "Member API unavailable"}. ${error.message}`,
        );
      setMembers(
        ((data || []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          name: String(row.name || "CA Student"),
          email: row.email ? String(row.email) : null,
          phone: row.phone ? String(row.phone) : null,
          createdAt: String(row.created_at),
          lastSignInAt: row.last_sign_in_at
            ? String(row.last_sign_in_at)
            : null,
          subscription: row.plan_id
            ? {
                user_id: String(row.id),
                plan_id: String(row.plan_id),
                status: String(
                  row.subscription_status,
                ) as Subscription["status"],
                starts_at: String(row.starts_at),
                ends_at: row.ends_at ? String(row.ends_at) : null,
                plan: {
                  name: String(row.plan_name),
                  slug: String(row.plan_slug),
                  rank: 0,
                },
              }
            : null,
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load members";
      setMemberError(message);
      flash(message);
    } finally {
      setMembersLoading(false);
    }
  };
  useEffect(() => {
    if (role && role !== "moderator" && session) void loadMembers();
  }, [role, session]);

  const saveSection = async (section: Section) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("app_sections")
      .update({
        ...section,
        updated_at: new Date().toISOString(),
        updated_by: session?.user.id,
      })
      .eq("id", section.id);
    if (!error)
      void logAction("section.updated", "app_section", section.id, {
        section_key: section.section_key,
      });
    flash(error ? error.message : "Section settings saved");
  };
  const saveElement = async (item: PageElement) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("app_page_elements")
      .update({
        ...item,
        updated_at: new Date().toISOString(),
        updated_by: session?.user.id,
      })
      .eq("id", item.id);
    flash(error ? error.message : "Element settings saved");
    if (!error) void loadAll();
  };
  const addElement = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const key = newElementKey.trim() || channelSlug(newElementLabel);
    const { error } = await supabase.from("app_page_elements").insert({
      page_key: elementPage,
      element_key: key,
      label: newElementLabel.trim(),
      element_type: newElementType,
      region: newElementType === "quick_action" ? "quick-actions" : "main",
      parent_key: newElementType === "quick_action" ? "quick-actions" : null,
      sort_order:
        pageElements.filter((item) => item.page_key === elementPage).length *
          10 +
        10,
      config: {
        variant: newElementType === "quick_action" ? "link" : "text",
      },
      appearance: {
        backgroundColor: "#ffffff",
        textColor: "#1d2939",
        borderColor: "#e2e8f0",
        borderRadius: 16,
        padding: 22,
        alignment: "left",
      },
      updated_by: session?.user.id,
    });
    flash(error ? error.message : "New element added");
    if (!error) {
      setNewElementKey("");
      setNewElementLabel("");
      void loadAll();
    }
  };
  const deleteElement = async (item: PageElement) => {
    if (
      !supabase ||
      !window.confirm(
        `Remove ${item.label} from the configurable page elements?`,
      )
    )
      return;
    const { error } = await supabase
      .from("app_page_elements")
      .delete()
      .eq("id", item.id);
    flash(error ? error.message : "Element removed");
    if (!error) void loadAll();
  };
  const saveAttempt = async (item: ExamAttempt) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("exam_attempts")
      .update({
        ...item,
        updated_at: new Date().toISOString(),
        updated_by: session?.user.id,
      })
      .eq("id", item.id);
    flash(error ? error.message : "Attempt saved");
    if (!error) void loadAll();
  };
  const addAttempt = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from("exam_attempts").insert({
      attempt_key:
        newAttempt.attempt_key ||
        channelSlug(`${newAttempt.course_level}-${newAttempt.label}`),
      course_level: newAttempt.course_level,
      label: newAttempt.label,
      exam_date: newAttempt.exam_date,
      registration_deadline: newAttempt.registration_deadline || null,
      notes: newAttempt.notes,
      sort_order:
        examAttempts.filter(
          (item) => item.course_level === newAttempt.course_level,
        ).length *
          10 +
        10,
      updated_by: session?.user.id,
    });
    flash(error ? error.message : "Attempt added");
    if (!error) {
      setNewAttempt({
        attempt_key: "",
        course_level: "Intermediate",
        label: "",
        exam_date: "",
        registration_deadline: "",
        notes: "",
      });
      void loadAll();
    }
  };
  const deleteAttempt = async (item: ExamAttempt) => {
    if (
      !supabase ||
      !window.confirm(
        `Delete ${item.label}? Students using it will fall back to the next active attempt.`,
      )
    )
      return;
    const { error } = await supabase
      .from("exam_attempts")
      .delete()
      .eq("id", item.id);
    flash(error ? error.message : "Attempt deleted");
    if (!error) void loadAll();
  };
  const savePlan = async (plan: Plan) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("subscription_plans")
      .update({
        name: plan.name,
        price_monthly: plan.price_monthly,
        active: plan.active,
      })
      .eq("id", plan.id);
    if (!error)
      void logAction("plan.updated", "subscription_plan", plan.id, {
        slug: plan.slug,
      });
    flash(error ? error.message : "Plan saved");
  };
  const addAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const uid = adminUid.trim();
    const { error } = await supabase.rpc("manage_admin", {
      target_user_id: uid,
      new_role: adminRole,
    });
    flash(error ? error.message : "Administrator role updated");
    if (!error) {
      setAdminUid("");
      void loadAll();
    }
  };
  const changeAdminRole = async (uid: string, nextRole: Role) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("manage_admin", {
      target_user_id: uid,
      new_role: nextRole,
    });
    flash(error ? error.message : "Administrator role updated");
    if (!error) void loadAll();
  };
  const removeAdmin = async (uid: string) => {
    if (!supabase || uid === session?.user.id) return;
    if (
      !window.confirm(
        "Remove all administrator and moderator access for this user?",
      )
    )
      return;
    const { error } = await supabase.rpc("manage_admin", {
      target_user_id: uid,
      new_role: null,
    });
    flash(error ? error.message : "Administrator access removed");
    if (!error) void loadAll();
  };
  const transferParent = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || role !== "parent_owner") return;
    if (
      !window.confirm(
        "Transfer parent ownership? You will remain an Owner and the selected user will receive full parent-owner control.",
      )
    )
      return;
    const { error } = await supabase.rpc("transfer_parent_owner", {
      new_parent_user_id: newParentUid.trim(),
    });
    flash(error ? error.message : "Parent ownership transferred");
    if (!error) {
      setNewParentUid("");
      window.setTimeout(() => window.location.reload(), 900);
    }
  };
  const setModeratorPermission = async (
    enabled: boolean,
    adminId = permissionAdmin,
    type = permissionType,
    channel = permissionChannel,
  ) => {
    if (!supabase || !adminId) return;
    const { error } = await supabase.rpc("set_moderation_permission", {
      target_admin_id: adminId,
      permission_kind: type,
      requested_channel: channel,
      enabled,
    });
    flash(
      error
        ? error.message
        : enabled
          ? "Moderator permission assigned"
          : "Moderator permission removed",
    );
    if (!error) void loadAll();
  };
  const futureDate = (duration: string) => {
    const date = new Date();
    const amount = Number(duration.slice(1));
    if (duration.startsWith("d")) date.setDate(date.getDate() + amount);
    else if (duration.startsWith("h")) date.setHours(date.getHours() + amount);
    else date.setMonth(date.getMonth() + amount);
    return date.toISOString();
  };
  const grantPlan = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !(role === "owner" || role === "parent_owner")) return;
    const uid = subscriberUid.trim();
    const endsAt = futureDate(subscriberDuration);
    const { error } = await supabase.from("user_subscriptions").upsert({
      user_id: uid,
      plan_id: subscriberPlan,
      status: subscriberStatus,
      starts_at: new Date().toISOString(),
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    });
    flash(error ? error.message : "Subscription updated");
    if (!error) {
      void logAction("subscription.updated", "user_subscription", uid, {
        plan_id: subscriberPlan,
        status: subscriberStatus,
        duration: subscriberDuration,
      });
      setSubscriberUid("");
      void loadAll();
      void loadMembers();
    }
  };
  const deleteMessage = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("community_messages")
      .delete()
      .eq("id", id);
    flash(error ? error.message : "Message deleted");
    if (!error) {
      void logAction("message.deleted", "community_message", id);
      setMessages((all) => all.filter((x) => x.id !== id));
    }
  };
  const deleteSelectedMessages = async () => {
    if (!supabase || !selectedMessages.length) return;
    const ids = [...selectedMessages];
    const { error } = await supabase
      .from("community_messages")
      .delete()
      .in("id", ids);
    flash(error ? error.message : `${ids.length} messages deleted`);
    if (!error) {
      void logAction("messages.bulk_deleted", "community_message", undefined, {
        count: ids.length,
      });
      setMessages((all) => all.filter((x) => !ids.includes(x.id)));
      setSelectedMessages([]);
    }
  };
  const blockChatUser = async (message: Chat) => {
    if (!supabase) return;
    if (
      !window.confirm(
        `Block ${message.display_name || "this member"} from #${message.channel} for ${blockHours} hour${blockHours === 1 ? "" : "s"}?`,
      )
    )
      return;
    const { data, error } = await supabase.rpc("block_chat_user", {
      target_user_id: message.user_id,
      requested_channel: message.channel,
      duration_hours: blockHours,
      block_reason: "Community guideline violation",
    });
    flash(
      error
        ? error.message
        : `Member blocked until ${new Date(data as string).toLocaleString()}`,
    );
  };
  const publishAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !announcement.trim()) return;
    const channel = allowedAnnouncementChannels.includes(announcementChannel)
      ? announcementChannel
      : allowedAnnouncementChannels[0];
    if (!channel) return;
    const expiresAt =
      announcementDuration === "never"
        ? null
        : futureDate(announcementDuration);
    const { error } = await supabase.rpc("publish_timed_announcement", {
      requested_channel: channel,
      announcement_message: announcement.trim(),
      announcement_expires_at: expiresAt,
    });
    flash(error ? error.message : "Announcement published and pinned");
    if (!error) {
      setAnnouncement("");
      void loadAll();
    }
  };
  const deleteAnnouncement = async (message: Chat) => {
    if (!supabase || !window.confirm("Delete this announcement permanently?"))
      return;
    const { error } = await supabase.rpc("delete_announcement", {
      target_message_id: message.id,
    });
    flash(error ? error.message : "Announcement deleted");
    if (!error) {
      setMessages((all) => all.filter((item) => item.id !== message.id));
      setAnnouncementMeta((all) =>
        all.filter((item) => item.message_id !== message.id),
      );
    }
  };
  const goBack = () => {
    const referrer = document.referrer;
    try {
      const previous = new URL(referrer);
      if (
        previous.origin === window.location.origin &&
        previous.pathname !== "/admin"
      ) {
        window.location.href = `${previous.pathname}${previous.search}${previous.hash}`;
        return;
      }
    } catch {}
    window.location.href = "/dashboard";
  };
  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/dashboard";
  };

  if (loading) return <div className="admin-state">Checking admin access…</div>;
  if (!session)
    return (
      <div className="admin-state">
        <Shield />
        <h1>Admin sign-in required</h1>
        <a href="/login">Sign in</a>
      </div>
    );
  if (!role)
    return (
      <div className="admin-state">
        <Shield />
        <h1>Access denied</h1>
        <p>This account has not been appointed as an administrator.</p>
        <a href="/dashboard">Return to dashboard</a>
      </div>
    );

  const allTabs: [Tab, string, React.ReactNode][] = [
    ["overview", "Overview", <BarChart3 key="o" />],
    ["sections", "Page builder", <LayoutGrid key="s" />],
    ["access", "Feature access", <ShieldCheck key="f" />],
    ["attempts", "Attempts", <CalendarDays key="e" />],
    ["plans", "Plans", <Crown key="p" />],
    ["subscriptions", "Members", <Users key="u" />],
    ["admins", "Admins", <Shield key="a" />],
    ["announcements", "Announcements", <Megaphone key="n" />],
    ["chat", "Chat moderation", <MessageCircle key="c" />],
    ["audit", "Audit history", <Shield key="h" />],
  ];
  const allowedTabs: Record<Role, Tab[]> = {
    parent_owner: [
      "overview",
      "sections",
      "access",
      "attempts",
      "plans",
      "subscriptions",
      "admins",
      "announcements",
      "chat",
      "audit",
    ],
    owner: [
      "overview",
      "sections",
      "access",
      "attempts",
      "plans",
      "subscriptions",
      "admins",
      "announcements",
      "chat",
    ],
    admin: [
      "overview",
      "sections",
      "access",
      "attempts",
      "plans",
      "subscriptions",
      "announcements",
      "chat",
    ],
    moderator: ["overview", "announcements", "chat"],
  };
  const tabs = allTabs.filter(([id]) => allowedTabs[role].includes(id));
  const assignedChatChannels = permissions
    .filter(
      (item) =>
        item.admin_user_id === session.user.id &&
        item.permission_type === "chat",
    )
    .map((item) => item.channel);
  const allMessageChannels = Array.from(
    new Set(messages.map((message) => message.channel)),
  );
  const manageableMessageChannels =
    role === "moderator" && !assignedChatChannels.includes("*")
      ? allMessageChannels.filter((channel) =>
          assignedChatChannels.includes(channel),
        )
      : allMessageChannels;
  const chatChannels = ["all", ...manageableMessageChannels];
  const permissionChannels = ["*", ...completeChatChannels];
  const announcementChannels = completeAnnouncementChannels;
  const allowedAnnouncementChannels =
    role === "moderator"
      ? announcementChannels.filter((channel) =>
          permissions.some(
            (item) =>
              item.admin_user_id === session.user.id &&
              item.permission_type === "announcement" &&
              (item.channel === channel || item.channel === "*"),
          ),
        )
      : announcementChannels;
  const visibleMessages = messages.filter(
    (message) =>
      manageableMessageChannels.includes(message.channel) &&
      (chatChannel === "all" || message.channel === chatChannel) &&
      `${message.display_name || ""} ${message.message}`
        .toLowerCase()
        .includes(chatSearch.toLowerCase()),
  );
  const visibleMembers = members.filter((member) =>
    `${member.name} ${member.id} ${member.email || ""} ${member.phone || ""} ${member.subscription?.plan?.name || "Free"}`
      .toLowerCase()
      .includes(memberSearch.toLowerCase()),
  );
  const canManageAdmin = (admin: Admin) =>
    admin.user_id !== session.user.id &&
    admin.role !== "parent_owner" &&
    (role === "parent_owner" || (role === "owner" && admin.role !== "owner"));
  const canEditSubscriptions = role === "parent_owner" || role === "owner";
  const activeAnnouncements = messages.filter(
    (item) =>
      item.channel.endsWith("-announcements") &&
      allowedAnnouncementChannels.includes(item.channel) &&
      (!announcementMeta.find((meta) => meta.message_id === item.id)
        ?.expires_at ||
        new Date(
          announcementMeta.find((meta) => meta.message_id === item.id)
            ?.expires_at || 0,
        ).getTime() > Date.now()),
  );
  const previewChannel =
    chatChannel === "all"
      ? manageableMessageChannels[0] || "general"
      : chatChannel;
  const previewMessages = messages
    .filter((item) => item.channel === previewChannel)
    .slice(0, 12)
    .reverse();
  const adminName = String(
    session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.email ||
      session.user.phone ||
      "Administrator",
  );

  return (
    <main
      className="admin-shell"
      style={
        tab === "sections"
          ? { gridTemplateColumns: "170px minmax(0,1fr)" }
          : undefined
      }
    >
      <aside className="admin-nav">
        <button type="button" onClick={goBack} className="admin-back">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="admin-brand">
          <span>CA</span>
          <div>
            <b>Admin panel</b>
            <small>{role.replace("_", " ")}</small>
          </div>
        </div>
        <nav>
          {tabs.map(([id, label, icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-account">
          <b>{adminName}</b>
          <span>{session.user.id}</span>
          <button onClick={() => setLogoutPrompt(true)}>
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>
      <section
        className="admin-main"
        style={tab === "sections" ? { padding: 16 } : undefined}
      >
        <header>
          <div>
            <h1>{tabs.find((x) => x[0] === tab)?.[1]}</h1>
            <p>Secure controls for the CA Progress application.</p>
          </div>
          <div className="admin-header-account">
            <span>
              <b>{adminName}</b>
              <small>{session.user.id}</small>
            </span>
            <span className="admin-role">{role.replace("_", " ")}</span>
          </div>
        </header>
        {tab === "overview" && (
          <>
            <div className="admin-kpis">
              <article>
                <span>Sections enabled</span>
                <b>{sections.filter((x) => x.enabled).length}</b>
                <small>of {sections.length}</small>
              </article>
              <article>
                <span>Active subscriptions</span>
                <b>
                  {
                    subscriptions.filter(
                      (x) => x.status === "active" || x.status === "trialing",
                    ).length
                  }
                </b>
                <small>members</small>
              </article>
              <article>
                <span>Administrators</span>
                <b>{admins.length}</b>
                <small>appointed</small>
              </article>
              <article>
                <span>Recent messages</span>
                <b>{messages.length}</b>
                <small>loaded</small>
              </article>
            </div>
            <div className="admin-grid">
              <article className="admin-card">
                <h3>Plan distribution</h3>
                {plans.map((plan) => (
                  <div className="overview-line" key={plan.id}>
                    <span>{plan.name}</span>
                    <b>
                      {
                        subscriptions.filter(
                          (item) =>
                            item.plan?.slug === plan.slug &&
                            (item.status === "active" ||
                              item.status === "trialing"),
                        ).length
                      }
                    </b>
                  </div>
                ))}
              </article>
              <article className="admin-card">
                <h3>Quick actions</h3>
                <div className="quick-admin">
                  <button onClick={() => setTab("announcements")}>
                    <Megaphone size={16} />
                    Publish announcement
                  </button>
                  <button onClick={() => setTab("subscriptions")}>
                    <Users size={16} />
                    Assign subscription
                  </button>
                  <button onClick={() => setTab("chat")}>
                    <MessageCircle size={16} />
                    Moderate chat
                  </button>
                </div>
              </article>
            </div>
          </>
        )}
        {tab === "sections" && <PageBuilderStudio />}
        {tab === "access" && <FeatureAccessEditor />}
        {false && (
          <>
            <section className="builder-intro">
              <div>
                <h2>Page and element builder</h2>
                <p>
                  Page cards below control sidebar visibility and access. The
                  detailed editor controls individual cards, sections and quick
                  actions inside each page.
                </p>
              </div>
              <select
                value={elementPage}
                onChange={(e) => setElementPage(e.target.value)}
              >
                {sections.map((section) => (
                  <option value={section.section_key} key={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </section>
            <div className="admin-grid">
              {sections.map((section, index) => (
                <article className="admin-card section-editor" key={section.id}>
                  <div className="editor-title">
                    <input
                      value={section.label}
                      onChange={(e) =>
                        setSections((all) =>
                          all.map((x, i) =>
                            i === index ? { ...x, label: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(e) =>
                          setSections((all) =>
                            all.map((x, i) =>
                              i === index
                                ? { ...x, enabled: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                      <span>{section.enabled ? "Visible" : "Hidden"}</span>
                    </label>
                  </div>
                  <textarea
                    value={section.description}
                    onChange={(e) =>
                      setSections((all) =>
                        all.map((x, i) =>
                          i === index
                            ? { ...x, description: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                  <div className="editor-fields">
                    <label>
                      Audience
                      <select
                        value={section.audience}
                        onChange={(e) =>
                          setSections((all) =>
                            all.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    audience: e.target
                                      .value as Section["audience"],
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <option value="all">Everyone</option>
                        <option value="guest">Guests only</option>
                        <option value="member">Members only</option>
                      </select>
                    </label>
                    <label>
                      Minimum plan
                      <select
                        value={section.minimum_plan_rank}
                        onChange={(e) =>
                          setSections((all) =>
                            all.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    minimum_plan_rank: Number(e.target.value),
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        {plans.map((p) => (
                          <option value={p.rank} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Sidebar order
                      <input
                        type="number"
                        value={section.sort_order}
                        onChange={(e) =>
                          setSections((all) =>
                            all.map((x, i) =>
                              i === index
                                ? { ...x, sort_order: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Accent colour
                      <input
                        type="color"
                        value={String(
                          section.appearance?.accentColor || "#2d68cf",
                        )}
                        onChange={(e) =>
                          setSections((all) =>
                            all.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    appearance: {
                                      ...x.appearance,
                                      accentColor: e.target.value,
                                    },
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Layout
                      <select
                        value={String(section.appearance?.layout || "standard")}
                        onChange={(e) =>
                          setSections((all) =>
                            all.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    appearance: {
                                      ...x.appearance,
                                      layout: e.target.value,
                                    },
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <option value="standard">Standard</option>
                        <option value="compact">Compact</option>
                        <option value="spacious">Spacious</option>
                      </select>
                    </label>
                    <label>
                      Start
                      <input
                        type="datetime-local"
                        value={section.starts_at?.slice(0, 16) || ""}
                        onChange={(e) =>
                          setSections((all) =>
                            all.map((x, i) =>
                              i === index
                                ? { ...x, starts_at: e.target.value || null }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      End
                      <input
                        type="datetime-local"
                        value={section.ends_at?.slice(0, 16) || ""}
                        onChange={(e) =>
                          setSections((all) =>
                            all.map((x, i) =>
                              i === index
                                ? { ...x, ends_at: e.target.value || null }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                  <button
                    className="admin-save"
                    onClick={() => saveSection(section)}
                  >
                    <Save size={15} />
                    Save page
                  </button>
                </article>
              ))}
            </div>
            <section className="element-builder">
              <header>
                <div>
                  <h2>
                    Elements ·{" "}
                    {sections.find(
                      (section) => section.section_key === elementPage,
                    )?.label || elementPage}
                  </h2>
                  <p>
                    Add, remove, rename, reorder and style individual elements.
                  </p>
                </div>
              </header>
              <form className="new-element" onSubmit={addElement}>
                <input
                  placeholder="Element label"
                  value={newElementLabel}
                  onChange={(e) => setNewElementLabel(e.target.value)}
                  required
                />
                <input
                  placeholder="Unique key (optional)"
                  value={newElementKey}
                  onChange={(e) =>
                    setNewElementKey(channelSlug(e.target.value))
                  }
                />
                <select
                  value={newElementType}
                  onChange={(e) =>
                    setNewElementType(
                      e.target.value as PageElement["element_type"],
                    )
                  }
                >
                  <option value="section">Section</option>
                  <option value="card">Card</option>
                  <option value="quick_action">Quick action</option>
                  <option value="content_block">Content block</option>
                </select>
                <button>Add element</button>
              </form>
              <div className="admin-grid">
                {pageElements
                  .filter((item) => item.page_key === elementPage)
                  .map((item, index) => (
                    <article className="admin-card element-card" key={item.id}>
                      <div className="editor-title">
                        <input
                          value={item.label}
                          onChange={(e) =>
                            setPageElements((all) =>
                              all.map((x) =>
                                x.id === item.id
                                  ? { ...x, label: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                        <label className="admin-toggle">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? { ...x, enabled: e.target.checked }
                                    : x,
                                ),
                              )
                            }
                          />
                          <span>{item.enabled ? "Visible" : "Hidden"}</span>
                        </label>
                      </div>
                      <textarea
                        value={item.description}
                        placeholder="Element description"
                        onChange={(e) =>
                          setPageElements((all) =>
                            all.map((x) =>
                              x.id === item.id
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <div className="editor-fields">
                        <label>
                          Type
                          <select
                            value={item.element_type}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        element_type: e.target
                                          .value as PageElement["element_type"],
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            <option value="section">Section</option>
                            <option value="card">Card</option>
                            <option value="quick_action">Quick action</option>
                            <option value="content_block">Content block</option>
                          </select>
                        </label>
                        <label>
                          Region
                          <input
                            value={item.region}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? { ...x, region: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Parent
                          <input
                            value={item.parent_key || ""}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        parent_key: e.target.value || null,
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Audience
                          <select
                            value={item.audience}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        audience: e.target
                                          .value as PageElement["audience"],
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            <option value="all">Everyone</option>
                            <option value="guest">Guests</option>
                            <option value="member">Members</option>
                          </select>
                        </label>
                        <label>
                          Minimum plan
                          <select
                            value={item.minimum_plan_rank}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        minimum_plan_rank: Number(
                                          e.target.value,
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            {plans.map((plan) => (
                              <option value={plan.rank} key={plan.id}>
                                {plan.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Order
                          <input
                            type="number"
                            value={item.sort_order}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        sort_order: Number(e.target.value),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Destination route
                          <input
                            value={String(item.config?.route || "")}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        config: {
                                          ...x.config,
                                          route: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Background
                          <input
                            type="color"
                            value={String(
                              item.appearance?.backgroundColor || "#ffffff",
                            )}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        appearance: {
                                          ...x.appearance,
                                          backgroundColor: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Text colour
                          <input
                            type="color"
                            value={String(
                              item.appearance?.textColor || "#1d2939",
                            )}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        appearance: {
                                          ...x.appearance,
                                          textColor: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Corner radius
                          <input
                            type="number"
                            min="0"
                            max="40"
                            value={Number(item.appearance?.borderRadius || 13)}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        appearance: {
                                          ...x.appearance,
                                          borderRadius: Number(e.target.value),
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="editor-fields advanced-fields">
                        <label>
                          Section design
                          <select
                            value={String(item.config?.variant || "text")}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        config: {
                                          ...x.config,
                                          variant: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            <option value="text">Text section</option>
                            <option value="notice">Notice banner</option>
                            <option value="hero">Hero section</option>
                            <option value="link">Link card</option>
                            <option value="spacer">Spacer</option>
                            <option value="native">Native app content</option>
                          </select>
                        </label>
                        <label>
                          Button label
                          <input
                            value={String(item.config?.buttonLabel || "")}
                            placeholder="Example: Open chapters"
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        config: {
                                          ...x.config,
                                          buttonLabel: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Image URL
                          <input
                            value={String(item.config?.imageUrl || "")}
                            placeholder="https://…"
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        config: {
                                          ...x.config,
                                          imageUrl: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Padding
                          <input
                            type="number"
                            min="0"
                            max="80"
                            value={Number(item.appearance?.padding ?? 22)}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        appearance: {
                                          ...x.appearance,
                                          padding: Number(e.target.value),
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Alignment
                          <select
                            value={String(item.appearance?.alignment || "left")}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        appearance: {
                                          ...x.appearance,
                                          alignment: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Centre</option>
                            <option value="right">Right</option>
                          </select>
                        </label>
                        <label>
                          Border colour
                          <input
                            type="color"
                            value={String(
                              item.appearance?.borderColor || "#e2e8f0",
                            )}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        appearance: {
                                          ...x.appearance,
                                          borderColor: e.target.value,
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Spacer height
                          <input
                            type="number"
                            min="0"
                            max="240"
                            value={Number(item.config?.height || 24)}
                            onChange={(e) =>
                              setPageElements((all) =>
                                all.map((x) =>
                                  x.id === item.id
                                    ? {
                                        ...x,
                                        config: {
                                          ...x.config,
                                          height: Number(e.target.value),
                                        },
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="element-actions">
                        <button
                          className="admin-save"
                          onClick={() => saveElement(item)}
                        >
                          <Save size={15} />
                          Save element
                        </button>
                        <button
                          className="element-delete"
                          onClick={() => deleteElement(item)}
                        >
                          <Trash2 size={15} />
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          </>
        )}
        {tab === "attempts" && (
          <>
            <article className="admin-card attempt-create">
              <h3>Add a future exam attempt</h3>
              <p>
                The date controls the dashboard countdown immediately. Disable
                an attempt to hide it without deleting it.
              </p>
              <form onSubmit={addAttempt}>
                <select
                  value={newAttempt.course_level}
                  onChange={(e) =>
                    setNewAttempt((value) => ({
                      ...value,
                      course_level: e.target
                        .value as ExamAttempt["course_level"],
                    }))
                  }
                >
                  <option value="Foundation">Foundation</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Final">Final</option>
                </select>
                <input
                  placeholder="Attempt label, e.g. May 2028"
                  value={newAttempt.label}
                  onChange={(e) =>
                    setNewAttempt((value) => ({
                      ...value,
                      label: e.target.value,
                    }))
                  }
                  required
                />
                <input
                  type="datetime-local"
                  value={newAttempt.exam_date}
                  onChange={(e) =>
                    setNewAttempt((value) => ({
                      ...value,
                      exam_date: e.target.value,
                    }))
                  }
                  required
                />
                <input
                  type="datetime-local"
                  title="Registration deadline"
                  value={newAttempt.registration_deadline}
                  onChange={(e) =>
                    setNewAttempt((value) => ({
                      ...value,
                      registration_deadline: e.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Unique key (optional)"
                  value={newAttempt.attempt_key}
                  onChange={(e) =>
                    setNewAttempt((value) => ({
                      ...value,
                      attempt_key: channelSlug(e.target.value),
                    }))
                  }
                />
                <button>Add attempt</button>
              </form>
            </article>
            <div className="admin-grid attempt-grid">
              {examAttempts.map((item) => (
                <article className="admin-card" key={item.id}>
                  <div className="editor-title">
                    <b>{item.course_level}</b>
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          setExamAttempts((all) =>
                            all.map((x) =>
                              x.id === item.id
                                ? { ...x, enabled: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                      <span>{item.enabled ? "Active" : "Hidden"}</span>
                    </label>
                  </div>
                  <div className="editor-fields attempt-fields">
                    <label>
                      Label
                      <input
                        value={item.label}
                        onChange={(e) =>
                          setExamAttempts((all) =>
                            all.map((x) =>
                              x.id === item.id
                                ? { ...x, label: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Exam begins
                      <input
                        type="datetime-local"
                        value={item.exam_date.slice(0, 16)}
                        onChange={(e) =>
                          setExamAttempts((all) =>
                            all.map((x) =>
                              x.id === item.id
                                ? { ...x, exam_date: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Registration deadline
                      <input
                        type="datetime-local"
                        value={item.registration_deadline?.slice(0, 16) || ""}
                        onChange={(e) =>
                          setExamAttempts((all) =>
                            all.map((x) =>
                              x.id === item.id
                                ? {
                                    ...x,
                                    registration_deadline:
                                      e.target.value || null,
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Order
                      <input
                        type="number"
                        value={item.sort_order}
                        onChange={(e) =>
                          setExamAttempts((all) =>
                            all.map((x) =>
                              x.id === item.id
                                ? { ...x, sort_order: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Internal notes
                    <textarea
                      value={item.notes}
                      onChange={(e) =>
                        setExamAttempts((all) =>
                          all.map((x) =>
                            x.id === item.id
                              ? { ...x, notes: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="element-actions">
                    <button
                      className="admin-save"
                      onClick={() => void saveAttempt(item)}
                    >
                      <Save size={15} />
                      Save attempt
                    </button>
                    <button
                      className="element-delete"
                      onClick={() => void deleteAttempt(item)}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "plans" && (
          <div className="admin-grid compact">
            {plans.map((plan, index) => (
              <article className="admin-card" key={plan.id}>
                <h3>{plan.slug}</h3>
                <label>
                  Display name
                  <input
                    value={plan.name}
                    onChange={(e) =>
                      setPlans((all) =>
                        all.map((x, i) =>
                          i === index ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Monthly price
                  <input
                    type="number"
                    value={plan.price_monthly}
                    onChange={(e) =>
                      setPlans((all) =>
                        all.map((x, i) =>
                          i === index
                            ? { ...x, price_monthly: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={plan.active}
                    onChange={(e) =>
                      setPlans((all) =>
                        all.map((x, i) =>
                          i === index ? { ...x, active: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                  Active plan
                </label>
                <button className="admin-save" onClick={() => savePlan(plan)}>
                  <Save size={15} />
                  Save plan
                </button>
              </article>
            ))}
          </div>
        )}
        {tab === "subscriptions" && (
          <>
            {canEditSubscriptions ? (
              <article className="admin-card admin-form-card wide">
                <h3>Assign or update a subscription</h3>
                <p>
                  Only Owners can edit subscriptions. Choose a fixed duration;
                  access expires automatically.
                </p>
                <form onSubmit={grantPlan}>
                  <input
                    placeholder="Member User UID"
                    value={subscriberUid}
                    onChange={(e) => setSubscriberUid(e.target.value)}
                    required
                  />
                  <select
                    value={subscriberPlan}
                    onChange={(e) => setSubscriberPlan(e.target.value)}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={subscriberStatus}
                    onChange={(e) =>
                      setSubscriberStatus(
                        e.target.value as Subscription["status"],
                      )
                    }
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trial</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={subscriberDuration}
                    onChange={(e) => setSubscriberDuration(e.target.value)}
                  >
                    <option value="d3">3 days</option>
                    <option value="d7">7 days</option>
                    <option value="m1">1 month</option>
                    <option value="m3">3 months</option>
                    <option value="m6">6 months</option>
                    <option value="m12">12 months</option>
                  </select>
                  <button>Save subscription</button>
                </form>
              </article>
            ) : (
              <article className="admin-card read-only-notice">
                <Shield size={18} />
                <div>
                  <h3>Read-only member access</h3>
                  <p>
                    Admins can view members and their subscriptions. Only Owners
                    can change subscription plans, status or duration.
                  </p>
                </div>
              </article>
            )}
            <div className="member-toolbar">
              <label>
                <Search size={15} />
                <input
                  placeholder="Search name, email, phone, UID or plan"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </label>
              <button onClick={() => void loadMembers()}>
                Refresh members
              </button>
            </div>
            {membersLoading ? (
              <div className="admin-card">Loading all Supabase users…</div>
            ) : memberError ? (
              <div className="admin-card member-error">
                <b>Members could not be loaded</b>
                <p>{memberError}</p>
                <small>
                  Run supabase/moderation-controls.sql and then press Refresh
                  members.
                </small>
              </div>
            ) : visibleMembers.length === 0 ? (
              <div className="admin-card">No members match this search.</div>
            ) : (
              <div className="admin-list member-list">
                {visibleMembers.map((member) => (
                  <article className="admin-card member-row" key={member.id}>
                    <div className="member-avatar">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-identity">
                      <b>{member.name}</b>
                      <span>
                        {member.email || member.phone || "No public contact"}
                      </span>
                      <small>UID · {member.id}</small>
                    </div>
                    <div className="member-plan">
                      <b>{member.subscription?.plan?.name || "Free"}</b>
                      <span>
                        {member.subscription?.status || "default"}
                        {member.subscription?.ends_at
                          ? ` · until ${new Date(member.subscription.ends_at).toLocaleDateString()}`
                          : ""}
                      </span>
                    </div>
                    {canEditSubscriptions && (
                      <button
                        onClick={() => {
                          setSubscriberUid(member.id);
                          setSubscriberPlan(
                            member.subscription?.plan_id || plans[0]?.id || "",
                          );
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit subscription
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
        {tab === "admins" && (
          <>
            <article className="admin-card admin-form-card">
              <h3>Appoint an administrator</h3>
              <p>
                Owners can manage Admins and Moderators. Only the Parent Owner
                can appoint or manage Owners.
              </p>
              <form onSubmit={addAdmin}>
                <input
                  placeholder="Supabase User UID"
                  value={adminUid}
                  onChange={(e) => setAdminUid(e.target.value)}
                  required
                />
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value as Role)}
                >
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  {role === "parent_owner" && (
                    <option value="owner">Owner</option>
                  )}
                </select>
                <button>Grant access</button>
              </form>
            </article>
            <article className="admin-card moderator-permissions">
              <h3>Moderator channel permissions</h3>
              <p>
                Admins and Owners automatically have every moderation feature.
                Assign only the required chat and announcement channels to
                Moderators.
              </p>
              <div className="permission-form">
                <select
                  value={permissionAdmin}
                  onChange={(e) => setPermissionAdmin(e.target.value)}
                >
                  <option value="">Select Moderator</option>
                  {admins
                    .filter((a) => a.role === "moderator")
                    .map((a) => (
                      <option value={a.user_id} key={a.user_id}>
                        {a.user_id}
                      </option>
                    ))}
                </select>
                <select
                  value={permissionType}
                  onChange={(e) => {
                    const type = e.target
                      .value as ModerationPermission["permission_type"];
                    setPermissionType(type);
                    setPermissionChannel(
                      type === "announcement" ? announcementChannels[0] : "*",
                    );
                  }}
                >
                  <option value="chat">Chat moderation</option>
                  <option value="announcement">Announcements</option>
                </select>
                <select
                  value={permissionChannel}
                  onChange={(e) => setPermissionChannel(e.target.value)}
                >
                  {(permissionType === "announcement"
                    ? ["*", ...announcementChannels]
                    : permissionChannels
                  ).map((channel) => (
                    <option key={channel} value={channel}>
                      {channel === "*" ? "All channels" : channel}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!permissionAdmin}
                  onClick={() => void setModeratorPermission(true)}
                >
                  Assign
                </button>
              </div>
              <div className="permission-chips">
                {permissions.map((item) => (
                  <button
                    key={`${item.admin_user_id}-${item.permission_type}-${item.channel}`}
                    onClick={() =>
                      void setModeratorPermission(
                        false,
                        item.admin_user_id,
                        item.permission_type,
                        item.channel,
                      )
                    }
                  >
                    <span>
                      {item.permission_type} · {item.channel}
                    </span>
                    <small>{item.admin_user_id}</small> ×
                  </button>
                ))}
              </div>
            </article>
            {role === "parent_owner" && (
              <article className="admin-card admin-form-card transfer-card">
                <h3>Transfer parent ownership</h3>
                <p>
                  This is the only way to stop being Parent Owner. The recipient
                  becomes the single Parent Owner and you become an Owner.
                </p>
                <form onSubmit={transferParent}>
                  <input
                    placeholder="New Parent Owner User UID"
                    value={newParentUid}
                    onChange={(e) => setNewParentUid(e.target.value)}
                    required
                  />
                  <button>Transfer ownership</button>
                </form>
              </article>
            )}
            <div className="admin-list">
              {admins.map((a) => (
                <article className="admin-card admin-row" key={a.user_id}>
                  <div>
                    <b>
                      {a.role.replace("_", " ")}
                      {a.user_id === session.user.id ? " · You" : ""}
                    </b>
                    <span>{a.user_id}</span>
                    <small>
                      {a.role === "parent_owner"
                        ? "Protected parent owner"
                        : a.user_id === session.user.id
                          ? "You cannot change your own role"
                          : ""}
                    </small>
                  </div>
                  {canManageAdmin(a) && (
                    <div className="admin-actions">
                      <select
                        value={a.role}
                        onChange={(e) =>
                          changeAdminRole(a.user_id, e.target.value as Role)
                        }
                      >
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                        {role === "parent_owner" && (
                          <option value="owner">Owner</option>
                        )}
                      </select>
                      <button onClick={() => removeAdmin(a.user_id)}>
                        <Trash2 size={15} />
                        Remove access
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "announcements" &&
          (allowedAnnouncementChannels.length ? (
            <>
              <article className="admin-card announcement-card">
                <h3>Publish a pinned announcement</h3>
                <p>
                  Choose when the announcement should automatically disappear
                  from the pinned carousel.
                </p>
                <form onSubmit={publishAnnouncement}>
                  <select
                    value={
                      allowedAnnouncementChannels.includes(announcementChannel)
                        ? announcementChannel
                        : allowedAnnouncementChannels[0]
                    }
                    onChange={(e) => setAnnouncementChannel(e.target.value)}
                  >
                    {allowedAnnouncementChannels.map((channel) => (
                      <option value={channel} key={channel}>
                        {channel.replace("-", " ")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={announcementDuration}
                    onChange={(e) => setAnnouncementDuration(e.target.value)}
                  >
                    <option value="h1">1 hour</option>
                    <option value="h8">8 hours</option>
                    <option value="h24">24 hours</option>
                    <option value="d3">3 days</option>
                    <option value="d7">7 days</option>
                    <option value="m1">1 month</option>
                    <option value="never">No expiry</option>
                  </select>
                  <textarea
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="Write the announcement…"
                    maxLength={2000}
                    required
                  />
                  <button>
                    <Megaphone size={15} />
                    Publish and pin
                  </button>
                </form>
              </article>
              <div className="admin-list announcement-list">
                {activeAnnouncements.map((item) => {
                  const meta = announcementMeta.find(
                    (value) => value.message_id === item.id,
                  );
                  return (
                    <article className="admin-card admin-row" key={item.id}>
                      <div>
                        <b>{item.message}</b>
                        <span>#{item.channel}</span>
                        <small>
                          {meta?.expires_at
                            ? `Expires ${new Date(meta.expires_at).toLocaleString()}`
                            : "No expiry"}
                        </small>
                      </div>
                      <button onClick={() => deleteAnnouncement(item)}>
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <article className="admin-card">
              <h3>No announcement channels assigned</h3>
              <p>An Owner must grant this Moderator access first.</p>
            </article>
          ))}
        {tab === "chat" && (
          <>
            <div className="moderation-toolbar">
              <label>
                <Search size={15} />
                <input
                  placeholder="Search messages or names"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                />
              </label>
              <select
                value={chatChannel}
                onChange={(e) => setChatChannel(e.target.value)}
              >
                {chatChannels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel === "all" ? "All channels" : `#${channel}`}
                  </option>
                ))}
              </select>
              <select
                value={blockHours}
                onChange={(e) => setBlockHours(Number(e.target.value))}
              >
                <option value={1}>Block 1 hour</option>
                <option value={8}>Block 8 hours</option>
                <option value={24}>Block 24 hours</option>
                <option value={48}>Block 48 hours</option>
              </select>
              <button
                disabled={!selectedMessages.length}
                onClick={deleteSelectedMessages}
              >
                <Trash2 size={15} />
                Delete selected ({selectedMessages.length})
              </button>
            </div>
            <div className="moderation-workspace">
              <div className="admin-list">
                {visibleMessages.map((m) => (
                  <article className="admin-card chat-admin-row" key={m.id}>
                    <input
                      className="message-check"
                      type="checkbox"
                      checked={selectedMessages.includes(m.id)}
                      onChange={(e) =>
                        setSelectedMessages((all) =>
                          e.target.checked
                            ? [...all, m.id]
                            : all.filter((id) => id !== m.id),
                        )
                      }
                    />
                    <div>
                      <small>
                        #{m.channel} · {new Date(m.created_at).toLocaleString()}
                      </small>
                      <b>{m.display_name || "CA Student"}</b>
                      <span>{m.user_id}</span>
                      <p>{m.message}</p>
                    </div>
                    <div className="chat-actions">
                      <button onClick={() => blockChatUser(m)}>
                        <ShieldAlert size={15} />
                        Block
                      </button>
                      <button onClick={() => deleteMessage(m.id)}>
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="mobile-live">
                <header>
                  <span>‹</span>
                  <div>
                    <b>#{previewChannel}</b>
                    <small>Live mobile preview</small>
                  </div>
                </header>
                <div className="mobile-live-messages">
                  {previewMessages.map((item) => (
                    <article
                      className={item.user_id === session.user.id ? "mine" : ""}
                      key={item.id}
                    >
                      <small>{item.display_name || "CA Student"}</small>
                      <p>{item.message}</p>
                      <time>
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </article>
                  ))}
                </div>
                <footer>Messages update live</footer>
              </aside>
            </div>
          </>
        )}
        {tab === "audit" && (
          <div className="admin-list">
            {auditLogs.map((log) => (
              <article className="admin-card audit-row" key={log.id}>
                <div>
                  <b>{log.action}</b>
                  <span>
                    {log.target_type}
                    {log.target_id ? ` · ${log.target_id}` : ""}
                  </span>
                </div>
                <small>
                  {new Date(log.created_at).toLocaleString()}
                  <br />
                  {log.actor_id || "System"}
                </small>
              </article>
            ))}
          </div>
        )}
        {notice && <div className="admin-toast">{notice}</div>}
      </section>
      {logoutPrompt && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLogoutPrompt(false);
          }}
        >
          <section className="admin-modal" role="dialog" aria-modal="true">
            <LogOut size={22} />
            <h3>Would you like to logout?</h3>
            <p>
              You will need to sign in again to access administrator controls.
            </p>
            <div>
              <button onClick={() => setLogoutPrompt(false)}>Cancel</button>
              <button className="confirm" onClick={() => void logout()}>
                Logout
              </button>
            </div>
          </section>
        </div>
      )}
      <style>{adminStyles}</style>
    </main>
  );
}

const adminStyles = `
.read-only-notice{display:flex;align-items:flex-start;gap:11px;border-color:#d7e3f5}.read-only-notice>svg{color:#2863c7;flex:0 0 auto}.read-only-notice h3{margin-bottom:5px}.read-only-notice p{margin:0;color:#728096;font-size:10px}.announcement-list{max-width:900px}.moderation-workspace{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}.moderation-workspace>.admin-list{margin-top:0}.mobile-live{position:sticky;top:20px;height:610px;border:8px solid #26344a;border-radius:32px;background:#eef2f7;overflow:hidden;box-shadow:0 18px 45px #17263d1f;display:grid;grid-template-rows:58px minmax(0,1fr) 45px}.mobile-live>header{padding:0 15px;display:flex;align-items:center;gap:10px;background:#fff;border-bottom:1px solid #e3e8ef}.mobile-live>header>span{font-size:25px}.mobile-live>header div{display:grid}.mobile-live>header b{font-size:11px;overflow:hidden;text-overflow:ellipsis;max-width:250px}.mobile-live>header small{font-size:8px;color:#7d899b}.mobile-live-messages{padding:14px 10px;overflow-y:auto;display:flex;flex-direction:column;gap:9px}.mobile-live-messages article{max-width:82%;align-self:flex-start;position:relative;padding:8px 10px 16px;border-radius:10px;background:#fff;box-shadow:0 2px 7px #17263d0d}.mobile-live-messages article.mine{align-self:flex-end;background:#dceaff}.mobile-live-messages small{font-size:8px;font-weight:750}.mobile-live-messages p{margin:3px 0 0;font-size:10px;white-space:pre-wrap}.mobile-live-messages time{position:absolute;right:7px;bottom:4px;color:#7f8a99;font-size:7px}.mobile-live>footer{display:grid;place-items:center;background:#fff;border-top:1px solid #e3e8ef;color:#8a96a8;font-size:9px}
.builder-intro{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px;padding:16px;border-radius:13px;background:#172b4d;color:#fff}.builder-intro h2,.element-builder h2{margin:0 0 5px;font-size:17px}.builder-intro p,.element-builder header p{margin:0;font-size:9px;opacity:.75}.builder-intro select{width:190px;height:38px;border:1px solid #ffffff33;border-radius:8px;background:#fff;color:#26364e;padding:0 9px}.element-builder{margin-top:24px;padding-top:20px;border-top:1px solid #dce3ed}.new-element{display:grid;grid-template-columns:1fr 1fr 160px auto;gap:8px;margin:12px 0}.new-element input,.new-element select,.new-element button{height:39px;border:1px solid #dce3ed;border-radius:8px;background:#fff;padding:0 10px;font-size:10px}.new-element button{border:0;background:#2863c7;color:#fff;font-weight:750}.element-card{border-top:3px solid #8aafe9}.element-actions{display:flex;justify-content:space-between;align-items:center}.element-delete{height:36px;margin-top:12px;border:1px solid #efd6d6;border-radius:8px;background:#fff6f6;color:#b54747;padding:0 11px;display:flex;align-items:center;gap:6px;font-size:9px}
.admin-nav{display:flex!important;flex-direction:column}.admin-back{border:0;background:transparent;padding:0 5px;cursor:pointer}.admin-account{margin-top:auto;padding:13px 6px 2px;border-top:1px solid #edf0f4;display:grid;gap:4px}.admin-account b{font-size:10px;overflow:hidden;text-overflow:ellipsis}.admin-account span{font-size:7px;color:#8b96a6;overflow:hidden;text-overflow:ellipsis}.admin-account button{height:34px;margin-top:6px;border:1px solid #efd6d6;border-radius:8px;background:#fff6f6;color:#b54747;display:flex;align-items:center;justify-content:center;gap:6px;font-size:9px}.admin-header-account{display:flex;align-items:center;gap:10px}.admin-header-account>span:first-child{display:grid;text-align:right;gap:2px;max-width:240px}.admin-header-account b{font-size:10px}.admin-header-account small{font-size:7px;color:#8591a2;overflow:hidden;text-overflow:ellipsis}.moderator-permissions{margin-top:12px}.moderator-permissions>p{font-size:10px;color:#748196}.permission-form{display:grid;grid-template-columns:1fr 150px 1fr auto;gap:8px}.permission-form select,.permission-form button{height:38px;border:1px solid #dfe5ed;border-radius:8px;background:#fff;padding:0 9px;font-size:9px}.permission-form button{background:#2863c7;color:#fff;border:0}.permission-form button:disabled{opacity:.45}.permission-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.permission-chips button{display:grid;gap:2px;text-align:left;border:1px solid #dfe5ed;border-radius:8px;background:#f8fafc;color:#536176;padding:7px 9px;font-size:8px}.permission-chips small{font-size:7px;color:#8b96a6}.chat-actions{display:flex!important;flex-direction:column}.chat-actions button:first-child{border-color:#eadba9;background:#fffaea;color:#8b6513}.chat-admin-row span{color:#8b96a6;font-size:8px}.admin-modal-backdrop{position:fixed;inset:0;z-index:100;background:#17263d66;display:grid;place-items:center;padding:18px}.admin-modal{width:min(390px,100%);background:#fff;border-radius:16px;padding:24px;text-align:center;box-shadow:0 24px 70px #17263d3d}.admin-modal>svg{color:#b54747}.admin-modal h3{margin:12px 0 6px}.admin-modal p{margin:0;color:#718096;font-size:11px;line-height:1.6}.admin-modal>div{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.admin-modal button{height:39px;border:1px solid #dce3ec;border-radius:9px;background:#fff;color:#526176}.admin-modal button.confirm{border:0;background:#b54747;color:#fff}
*{box-sizing:border-box}.admin-shell{min-height:100dvh;background:#f5f7fb;color:#1d2939;display:grid;grid-template-columns:220px minmax(0,1fr);font-family:Inter,system-ui,sans-serif}.admin-nav{position:sticky;top:0;height:100dvh;padding:18px 12px;background:#fff;border-right:1px solid #e4e9f1;overflow-y:auto}.admin-back{height:35px;display:flex;align-items:center;gap:7px;color:#68758a;text-decoration:none;font-size:11px}.admin-brand{display:flex;align-items:center;gap:10px;padding:18px 5px}.admin-brand>span{width:37px;height:37px;display:grid;place-items:center;border-radius:10px;background:#eaf1ff;color:#2863c7;font-weight:850}.admin-brand div{display:grid}.admin-brand b{font-size:13px}.admin-brand small{text-transform:capitalize;color:#738096;font-size:9px}.admin-nav nav{display:grid;gap:4px;margin-top:6px}.admin-nav nav button{height:42px;border:0;border-radius:9px;background:transparent;color:#5f6d81;display:flex;align-items:center;gap:10px;padding:0 12px;text-align:left;font-size:11px}.admin-nav nav svg{width:17px}.admin-nav nav button.active{background:#eaf1ff;color:#2863c7;font-weight:750}.admin-main{min-width:0;padding:28px}.admin-main>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.admin-main h1{margin:0 0 4px;font-size:25px}.admin-main header p{margin:0;color:#7b8799;font-size:11px}.admin-role{padding:6px 10px;border-radius:999px;background:#eaf1ff;color:#2863c7;font-size:9px;font-weight:800;text-transform:capitalize}.admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.admin-grid.compact{grid-template-columns:repeat(3,minmax(0,1fr))}.admin-card{background:#fff;border:1px solid #e3e8f0;border-radius:13px;padding:16px;box-shadow:0 7px 24px rgba(38,58,90,.04)}.editor-title{display:flex;justify-content:space-between;gap:10px}.editor-title>input{border:0;font-weight:800;font-size:14px;padding:0;min-width:0}.admin-card input,.admin-card select,.admin-card textarea{width:100%;border:1px solid #dfe5ed;border-radius:8px;padding:9px 10px;background:#fff;outline:0;font-size:10px}.admin-card textarea{min-height:58px;margin:10px 0;resize:vertical}.admin-card label{display:grid;gap:5px;color:#667489;font-size:9px}.editor-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.admin-toggle{display:flex!important;align-items:center!important;grid-template-columns:auto 1fr}.admin-toggle input,.check input{width:auto}.admin-save,.admin-form-card button{height:36px;margin-top:12px;border:0;border-radius:8px;background:#2863c7;color:#fff;padding:0 12px;display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:750}.admin-card h3{margin:0 0 12px;font-size:14px}.admin-card>label{margin-top:9px}.check{display:flex!important;align-items:center;gap:7px!important}.admin-form-card{max-width:720px}.admin-form-card.wide{max-width:none}.admin-form-card p{color:#7b8799;font-size:10px}.admin-form-card form{display:grid;grid-template-columns:1fr 180px auto;gap:8px}.admin-form-card.wide form{grid-template-columns:minmax(180px,1fr) 130px 110px 180px auto}.admin-form-card form button{margin:0;height:38px}.admin-list{display:grid;gap:8px;margin-top:12px}.admin-row,.chat-admin-row{display:flex;align-items:center;justify-content:space-between;gap:14px}.admin-row div,.chat-admin-row div{min-width:0;display:grid;gap:4px}.admin-row b{text-transform:capitalize}.admin-row span{color:#7b8799;font-size:9px;overflow:hidden;text-overflow:ellipsis}.admin-row small{color:#8b96a6;font-size:8px}.admin-row button,.chat-admin-row button{border:1px solid #efd6d6;background:#fff6f6;color:#b54747;border-radius:8px;padding:8px 10px;display:flex;align-items:center;gap:6px;font-size:9px}.subscription-list .admin-row>select{width:125px;border:1px solid #dfe5ed;border-radius:8px;padding:8px;font-size:9px}.chat-admin-row small{color:#8994a4;font-size:8px}.chat-admin-row b{font-size:11px}.chat-admin-row p{margin:0;color:#4c596b;font-size:11px;white-space:pre-wrap}.message-check{width:16px!important;height:16px;flex:0 0 16px}.admin-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}.admin-kpis article{padding:17px;background:#fff;border:1px solid #e3e8f0;border-radius:12px;display:grid;gap:4px}.admin-kpis span{color:#6f7d91;font-size:9px}.admin-kpis b{font-size:25px;color:#2863c7}.admin-kpis small{color:#929baa;font-size:8px}.overview-line{display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid #edf0f4;font-size:10px}.quick-admin{display:grid;gap:7px}.quick-admin button{height:38px;border:1px solid #dfe5ed;border-radius:8px;background:#fff;color:#46566c;display:flex;align-items:center;gap:8px;padding:0 10px;font-size:10px}.moderation-toolbar{display:grid;grid-template-columns:minmax(200px,1fr) 200px auto;gap:8px;margin-bottom:10px}.moderation-toolbar label{height:40px;display:flex;align-items:center;gap:7px;padding:0 10px;border:1px solid #dfe5ed;border-radius:9px;background:#fff}.moderation-toolbar input{width:100%;border:0;outline:0}.moderation-toolbar select,.moderation-toolbar button{border:1px solid #dfe5ed;border-radius:9px;background:#fff;padding:0 10px;font-size:9px}.moderation-toolbar button{background:#fff6f6;color:#b54747;display:flex;align-items:center;gap:6px}.moderation-toolbar button:disabled{opacity:.45}.announcement-card{max-width:760px}.announcement-card>p{color:#7b8799;font-size:10px}.announcement-card form{display:grid;gap:9px}.announcement-card textarea{min-height:170px!important;margin:0}.announcement-card button{height:40px;justify-self:start;border:0;border-radius:8px;background:#2863c7;color:#fff;padding:0 14px;display:flex;align-items:center;gap:7px;font-size:10px;font-weight:750}.audit-row{display:flex;justify-content:space-between;gap:15px}.audit-row div{display:grid;gap:4px}.audit-row b{font-size:11px}.audit-row span,.audit-row small{color:#8490a1;font-size:8px}.admin-toast{position:fixed;right:20px;bottom:20px;padding:11px 15px;border-radius:9px;background:#203454;color:#fff;font-size:10px}.admin-state{min-height:100dvh;display:grid;place-content:center;justify-items:center;gap:9px;background:#f5f7fb;text-align:center;color:#536176}.admin-state h1{margin:5px 0 0;color:#1d2939}.admin-state p{max-width:420px}.admin-state a{color:#2863c7}
.member-toolbar{display:flex;gap:8px;margin-top:13px}.member-toolbar label{height:40px;flex:1;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #dfe5ed;border-radius:9px;background:#fff}.member-toolbar input{width:100%;border:0;outline:0}.member-toolbar button{border:1px solid #d8e1ed;border-radius:9px;background:#fff;color:#46566c;padding:0 13px;font-size:10px}.member-row{display:grid;grid-template-columns:42px minmax(0,1fr) 130px auto;align-items:center;gap:12px}.member-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#eaf1ff;color:#2863c7;font-weight:850}.member-identity{display:grid;gap:3px;min-width:0}.member-identity b{font-size:11px}.member-identity span,.member-identity small{color:#7b8799;font-size:9px;overflow:hidden;text-overflow:ellipsis}.member-plan{display:grid;gap:3px}.member-plan b{font-size:10px}.member-plan span{font-size:8px;color:#78869a;text-transform:capitalize}.member-row>button{border:1px solid #d8e1ed;border-radius:8px;background:#fff;color:#2863c7;padding:8px 10px;font-size:9px}.admin-actions{display:flex!important;grid-template-columns:none!important;flex-direction:row!important;align-items:center}.admin-actions select{width:115px;border:1px solid #dfe5ed;border-radius:8px;padding:8px;font-size:9px}.transfer-card{margin-top:12px;border-color:#ecdba6}.transfer-card form{grid-template-columns:1fr auto}.transfer-card form button{background:#9b6d11}
@media(max-width:850px){.admin-shell{display:block}.admin-nav{position:static;width:100%;height:auto;border-right:0;border-bottom:1px solid #e4e9f1}.admin-brand{padding:8px 5px}.admin-nav nav{display:flex;overflow-x:auto}.admin-nav nav button{flex:0 0 auto}.admin-main{padding:16px}.admin-grid,.admin-grid.compact{grid-template-columns:1fr}.editor-fields{grid-template-columns:1fr 1fr}.admin-kpis{grid-template-columns:1fr 1fr}.admin-form-card.wide form{grid-template-columns:1fr 1fr}.moderation-toolbar{grid-template-columns:1fr 160px}.member-row{grid-template-columns:42px minmax(0,1fr) auto}.member-plan{grid-column:2}.member-row>button{grid-column:3;grid-row:1/3}}
@media(max-width:520px){.admin-main{padding:12px}.admin-main>header{align-items:flex-start}.admin-main h1{font-size:21px}.admin-form-card form,.admin-form-card.wide form{grid-template-columns:1fr}.editor-fields{grid-template-columns:1fr}.admin-row,.chat-admin-row{align-items:flex-start}.chat-admin-row button{flex:0 0 auto}.admin-kpis{grid-template-columns:1fr 1fr}.moderation-toolbar{grid-template-columns:1fr}.moderation-toolbar>*{min-height:40px}.audit-row{display:grid}.member-toolbar{display:grid}.member-toolbar button{height:40px}.member-row{grid-template-columns:38px minmax(0,1fr);align-items:start}.member-plan{grid-column:2}.member-row>button{grid-column:1/-1;grid-row:auto;width:100%}.admin-actions{width:100%;margin-top:8px;flex-wrap:wrap}.admin-actions select,.admin-actions button{flex:1}.transfer-card form{grid-template-columns:1fr}}
@media(max-width:850px){.admin-nav{display:block!important}.admin-account{margin-top:10px}.permission-form{grid-template-columns:1fr 1fr}.moderation-toolbar{grid-template-columns:1fr 150px}.admin-header-account>span:first-child{display:none}}
@media(max-width:520px){.permission-form{grid-template-columns:1fr}.chat-actions{width:100%;flex-direction:row}.chat-actions button{flex:1}.admin-header-account{gap:5px}}
@media(max-width:700px){.builder-intro{align-items:stretch;flex-direction:column}.builder-intro select{width:100%}.new-element{grid-template-columns:1fr}.element-actions{align-items:stretch;flex-direction:column}.element-delete{justify-content:center}.element-card .editor-fields{grid-template-columns:1fr}}
@media(max-width:1050px){.moderation-workspace{grid-template-columns:1fr}.mobile-live{position:relative;top:auto;width:min(360px,100%);height:600px;margin:0 auto}}
`;
