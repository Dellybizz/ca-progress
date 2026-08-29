"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient, Session } from "@supabase/supabase-js";
import { SubjectName } from "@/lib/syllabus";

export type Stage =
  "done" | "revision1" | "revision2" | "testDone" | "test2Done";

export type Progress = Record<string, Partial<Record<Stage, boolean>>>;

export type ActivityItem = {
  id: string;
  chapter: string;
  subject: string;
  stage: Stage;
  time: string;
};

export type StudySessionItem = {
  id: string;
  subject: SubjectName;
  minutes: number;
  date: string;
};

export type GoalItem = {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
};

export type TestItem = {
  id: string;
  subject: SubjectName;
  score: number;
  maxScore: number;
  date: string;
};

export type CalendarItem = {
  id: string;
  title: string;
  date: string;
};

export type NoteItem = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type AppSectionRule = {
  section_key: string;
  label: string;
  route: string;
  enabled: boolean;
  audience: "all" | "guest" | "member";
  minimum_plan_rank: number;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  appearance: Record<string, unknown>;
};
export type AppPageElement = {
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
export type AppExamAttempt = {
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
export type FeatureAccess = {
  feature_key: string;
  feature_label: string;
  plan_slug: string;
  plan_name: string;
  allowed: boolean;
  limit_value: number | null;
  limit_unit: string;
  used_value: number;
  remaining_value: number | null;
  reset_period: string;
  reset_at: string | null;
  upgrade_message: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const rememberDeviceKey = "ca-progress-remember-device";

const authStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") return null;

    const remember = window.localStorage.getItem(rememberDeviceKey) !== "false";

    return remember
      ? window.localStorage.getItem(key) || window.sessionStorage.getItem(key)
      : window.sessionStorage.getItem(key);
  },

  setItem(key: string, value: string) {
    if (typeof window === "undefined") return;

    const remember = window.localStorage.getItem(rememberDeviceKey) !== "false";

    if (remember) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },

  removeItem(key: string) {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: authStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

const defaultStudyHours = [0, 0, 0, 0, 0, 0, 0];

const legacySampleStudyHours = [1.2, 2.1, 1.6, 2.8, 2.4, 3.5, 4.5];

const isLegacySample = (hours?: number[]) =>
  Boolean(
    hours &&
    hours.length === legacySampleStudyHours.length &&
    hours.every((value, index) => value === legacySampleStudyHours[index]),
  );

type ProgressContextValue = {
  session: Session | null;
  authLoading: boolean;
  dataReady: boolean;
  guestMode: boolean;
  configured: boolean;
  planRank: number;
  planSlug: string;
  isAdmin: boolean;
  sectionRules: AppSectionRule[];
  pageElements: AppPageElement[];
  examAttempts: AppExamAttempt[];
  featureAccess: Record<string, FeatureAccess>;
  refreshFeatureAccess: (featureKey?: string) => Promise<void>;

  progress: Progress;
  setProgress: Dispatch<SetStateAction<Progress>>;

  activities: ActivityItem[];
  setActivities: Dispatch<SetStateAction<ActivityItem[]>>;

  studyHours: number[];
  setStudyHours: Dispatch<SetStateAction<number[]>>;

  studySessions: StudySessionItem[];
  setStudySessions: Dispatch<SetStateAction<StudySessionItem[]>>;

  goals: GoalItem[];
  setGoals: Dispatch<SetStateAction<GoalItem[]>>;

  tests: TestItem[];
  setTests: Dispatch<SetStateAction<TestItem[]>>;

  calendarItems: CalendarItem[];
  setCalendarItems: Dispatch<SetStateAction<CalendarItem[]>>;

  notes: NoteItem[];
  setNotes: Dispatch<SetStateAction<NoteItem[]>>;

  saveStatus: SaveStatus;

  sendPhoneOtp: (
    phone: string,
    rememberOnDevice: boolean,
  ) => Promise<string | null>;

  verifyPhoneOtp: (
    phone: string,
    token: string,
    rememberOnDevice: boolean,
  ) => Promise<string | null>;

  signInWithGoogle: (rememberOnDevice: boolean) => Promise<string | null>;

  signOut: () => Promise<void>;

  continueAsGuest: () => void;

  requireAuth: () => void;

  saveProgress: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [dataReady, setDataReady] = useState(false);

  const [guestMode, setGuestMode] = useState(false);

  const [progress, setProgress] = useState<Progress>({});

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [studyHours, setStudyHours] = useState(defaultStudyHours);

  const [studySessions, setStudySessions] = useState<StudySessionItem[]>([]);

  const [goals, setGoals] = useState<GoalItem[]>([]);

  const [tests, setTests] = useState<TestItem[]>([]);

  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);

  const [notes, setNotes] = useState<NoteItem[]>([]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const [planRank, setPlanRank] = useState(0);
  const [planSlug, setPlanSlug] = useState("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sectionRules, setSectionRules] = useState<AppSectionRule[]>([]);
  const [pageElements, setPageElements] = useState<AppPageElement[]>([]);
  const [examAttempts, setExamAttempts] = useState<AppExamAttempt[]>([]);
  const [featureAccess, setFeatureAccess] = useState<
    Record<string, FeatureAccess>
  >({});

  const dataReadyRef = useRef(false);

  /* =========================================================
     AUTH SESSION
  ========================================================= */

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;

        setSession(nextSession);

        if (nextSession) {
          setGuestMode(false);
        }

        setAuthLoading(false);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    const loadAccess = async () => {
      const [{ data: rules }, { data: elements }, { data: attempts }] =
        await Promise.all([
          supabase
            .from("app_sections")
            .select(
              "section_key,label,route,enabled,audience,minimum_plan_rank,sort_order,starts_at,ends_at,appearance",
            )
            .order("sort_order"),
          supabase.from("app_page_elements").select("*").order("sort_order"),
          supabase
            .from("exam_attempts")
            .select("*")
            .eq("enabled", true)
            .order("sort_order"),
        ]);

      if (!cancelled && rules) {
        setSectionRules(rules as AppSectionRule[]);
      }
      if (!cancelled && elements) setPageElements(elements as AppPageElement[]);
      if (!cancelled && attempts) setExamAttempts(attempts as AppExamAttempt[]);

      if (!session?.user.id) {
        if (!cancelled) {
          setPlanRank(0);
          setPlanSlug("free");
          setIsAdmin(false);
        }
        return;
      }

      const [{ data: subscription }, { data: admin }] = await Promise.all([
        supabase
          .from("user_subscriptions")
          .select("status,ends_at,plan:subscription_plans(slug,rank)")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const plan = subscription?.plan as unknown as {
        slug: string;
        rank: number;
      } | null;
      const active =
        subscription?.status === "active" ||
        subscription?.status === "trialing";
      const unexpired =
        !subscription?.ends_at ||
        new Date(subscription.ends_at).getTime() > Date.now();

      setPlanRank(active && unexpired && plan ? plan.rank : 0);
      setPlanSlug(active && unexpired && plan ? plan.slug : "free");
      setIsAdmin(Boolean(admin));
    };

    void loadAccess();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const refreshFeatureAccess = async (featureKey?: string) => {
    if (!supabase) return;
    const keys = featureKey
      ? [featureKey]
      : (
          (
            await supabase
              .from("app_features")
              .select("feature_key")
              .eq("enabled", true)
              .order("sort_order")
          ).data || []
        ).map((item) => item.feature_key);
    if (!keys.length) return;
    const rows = await Promise.all(
      keys.map(async (requestedFeature) => {
        const { data, error } = await supabase.rpc("get_my_feature_access", {
          requested_feature: requestedFeature,
        });
        return error ? null : (data?.[0] as FeatureAccess | undefined) || null;
      }),
    );
    setFeatureAccess((current) => ({
      ...current,
      ...Object.fromEntries(
        rows
          .filter((row): row is FeatureAccess => Boolean(row))
          .map((row) => [row.feature_key, row]),
      ),
    }));
  };

  useEffect(() => {
    void refreshFeatureAccess();
  }, [session?.user.id, planSlug]);

  /* =========================================================
     LOAD USER DATA
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    dataReadyRef.current = false;
    setDataReady(false);

    if (!supabase || !session?.user.id) {
      setProgress({});
      setActivities([]);
      setStudyHours(defaultStudyHours);
      setStudySessions([]);
      setGoals([]);
      setTests([]);
      setCalendarItems([]);
      setNotes([]);

      dataReadyRef.current = true;
      setDataReady(true);

      return;
    }

    supabase
      .from("user_progress")
      .select("progress")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          console.error("Unable to load progress:", error.message);
        }

        const saved = data?.progress as
          | Partial<{
              progress: Progress;
              activities: ActivityItem[];
              studyHours: number[];
              studySessions: StudySessionItem[];
              goals: GoalItem[];
              tests: TestItem[];
              calendarItems: CalendarItem[];
              notes: NoteItem[];
            }>
          | undefined;

        setProgress(saved?.progress || {});

        setActivities(saved?.activities || []);

        setStudyHours(
          isLegacySample(saved?.studyHours)
            ? defaultStudyHours
            : saved?.studyHours || defaultStudyHours,
        );

        setStudySessions(saved?.studySessions || []);

        setGoals(saved?.goals || []);

        setTests(saved?.tests || []);

        setCalendarItems(saved?.calendarItems || []);

        setNotes(saved?.notes || []);

        dataReadyRef.current = true;
        setDataReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  /* =========================================================
     PHONE OTP LOGIN
  ========================================================= */

  const setRememberPreference = (rememberOnDevice: boolean) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(rememberDeviceKey, String(rememberOnDevice));
    }
  };

  const sendPhoneOtp = async (phone: string, rememberOnDevice: boolean) => {
    if (!supabase) {
      return "Supabase is not configured. Check your Vercel environment variables.";
    }

    setRememberPreference(rememberOnDevice);

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    return error?.message || null;
  };

  const verifyPhoneOtp = async (
    phone: string,
    token: string,
    rememberOnDevice: boolean,
  ) => {
    if (!supabase) {
      return "Supabase is not configured. Check your Vercel environment variables.";
    }

    setRememberPreference(rememberOnDevice);

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    return error?.message || null;
  };

  /* =========================================================
     GOOGLE LOGIN
  ========================================================= */

  const signInWithGoogle = async (
    rememberOnDevice: boolean,
  ): Promise<string | null> => {
    if (!supabase) {
      return "Supabase is not configured. Check your Vercel environment variables.";
    }

    setRememberPreference(rememberOnDevice);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    return error?.message || null;
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  /* =========================================================
     SAVE PROGRESS
  ========================================================= */

  const saveProgress = async () => {
    if (!supabase || !session?.user.id || !dataReadyRef.current) {
      return;
    }

    setSaveStatus("saving");

    const { error } = await supabase.from("user_progress").upsert(
      {
        user_id: session.user.id,

        progress: {
          progress,
          activities,
          studyHours,
          studySessions,
          goals,
          tests,
          calendarItems,
          notes,
        },

        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      console.error("Unable to save progress:", error.message);

      setSaveStatus("error");

      return;
    }

    setSaveStatus("saved");

    window.setTimeout(() => setSaveStatus("idle"), 1800);
  };

  return (
    <ProgressContext.Provider
      value={{
        session,
        authLoading,
        dataReady,
        guestMode,

        configured: Boolean(supabase),
        planRank,
        planSlug,
        isAdmin,
        sectionRules,
        pageElements,
        examAttempts,
        featureAccess,
        refreshFeatureAccess,

        progress,
        setProgress,

        activities,
        setActivities,

        studyHours,
        setStudyHours,

        studySessions,
        setStudySessions,

        goals,
        setGoals,

        tests,
        setTests,

        calendarItems,
        setCalendarItems,

        notes,
        setNotes,

        saveStatus,

        sendPhoneOtp,
        verifyPhoneOtp,
        signInWithGoogle,
        signOut,

        continueAsGuest: () => setGuestMode(true),

        requireAuth: () => setGuestMode(false),

        saveProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const value = useContext(ProgressContext);

  if (!value) {
    throw new Error("useProgress must be used inside ProgressProvider");
  }

  return value;
}
