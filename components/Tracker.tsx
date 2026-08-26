"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Flame,
  Goal,
  Home,
  LineChart,
  LogOut,
  Menu,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Target,
  Trophy,
} from "lucide-react";

import {
  createClient,
  Session,
} from "@supabase/supabase-js";

import {
  syllabus,
  SubjectName,
} from "@/lib/syllabus";

/* =========================================================
   SUPABASE
========================================================= */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(
        supabaseUrl,
        supabaseAnonKey
      )
    : null;

/* =========================================================
   TYPES
========================================================= */

type Stage =
  | "done"
  | "revision1"
  | "revision2"
  | "testDone";

type Progress = Record<
  string,
  Partial<Record<Stage, boolean>>
>;

type ActivityItem = {
  id: string;
  chapter: string;
  subject: string;
  stage: Stage;
  time: string;
};

type View =
  | "Dashboard"
  | "Subjects"
  | "Chapters"
  | "Analytics"
  | "Study Sessions"
  | "Goals"
  | "Test Series"
  | "Calendar"
  | "Activity"
  | "Notes"
  | "Settings";

type AuthMode =
  | "login"
  | "signup";

/* =========================================================
   CONSTANTS
========================================================= */

const stages: {
  key: Stage;
  label: string;
  short: string;
}[] = [
  {
    key: "done",
    label: "Chapter Done",
    short: "Done",
  },
  {
    key: "revision1",
    label: "1st Revision",
    short: "1R",
  },
  {
    key: "revision2",
    label: "2nd Revision",
    short: "2R",
  },
  {
    key: "testDone",
    label: "Test Done",
    short: "Test",
  },
];

const menu: {
  label: View;
  icon: typeof Home;
}[] = [
  {
    label: "Dashboard",
    icon: Home,
  },
  {
    label: "Subjects",
    icon: BookOpen,
  },
  {
    label: "Chapters",
    icon: NotebookPen,
  },
  {
    label: "Analytics",
    icon: LineChart,
  },
  {
    label: "Study Sessions",
    icon: Clock3,
  },
  {
    label: "Goals",
    icon: Target,
  },
  {
    label: "Test Series",
    icon: ClipboardCheck,
  },
  {
    label: "Calendar",
    icon: CalendarDays,
  },
  {
    label: "Activity",
    icon: Activity,
  },
  {
    label: "Notes",
    icon: FileText,
  },
  {
    label: "Settings",
    icon: Settings,
  },
];

const subjectMeta: Record<
  SubjectName,
  {
    code: string;
    color: string;
    short: string;
  }
> = {
  "Advanced Accounting": {
    code: "AA",
    color: "#5b6fd6",
    short: "Advanced Accounting",
  },

  "Corporate and Other Laws": {
    code: "CL",
    color: "#d94c8a",
    short: "Corporate & Other Laws",
  },

  Taxation: {
    code: "TX",
    color: "#f19a35",
    short: "Taxation",
  },

  "Cost and Management Accounting": {
    code: "CM",
    color: "#3e84c7",
    short: "Cost & Management A/c",
  },

  "Auditing and Ethics": {
    code: "AE",
    color: "#46a597",
    short: "Auditing & Ethics",
  },

  "Financial Management & Strategic Management": {
    code: "FM",
    color: "#2f78bd",
    short: "Financial Management",
  },
};

const stageCopy: Record<
  Stage,
  string
> = {
  done: "Marked as Done",
  revision1: "1st Revision Completed",
  revision2: "2nd Revision Completed",
  testDone: "Test Completed",
};

const keyFor = (
  subject: string,
  chapter: string
) => {
  return `${subject}::${chapter}`;
};

const defaultStudyHours = [
  1.2,
  2.1,
  1.6,
  2.8,
  2.4,
  3.5,
  4.5,
];

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Tracker() {
  const [session, setSession] =
    useState<Session | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [authMode, setAuthMode] =
    useState<AuthMode>("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [authError, setAuthError] =
    useState("");

  const [authMessage, setAuthMessage] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  /* =======================================================
     CHECK LOGIN SESSION
  ======================================================= */

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    const loadSession = async () => {
      const {
        data,
      } =
        await supabase.auth.getSession();

      if (mounted) {
        setSession(
          data.session
        );

        setAuthLoading(false);
      }
    };

    loadSession();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (mounted) {
            setSession(
              newSession
            );

            setAuthLoading(false);
          }
        }
      );

    return () => {
      mounted = false;

      listener.subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     LOGIN / SIGNUP
  ======================================================= */

  const handleAuth = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!supabase) {
      setAuthError(
        "Supabase is not configured. Check your Vercel environment variables."
      );

      return;
    }

    setAuthError("");
    setAuthMessage("");
    setSubmitting(true);

    try {
      if (authMode === "login") {
        const {
          error,
        } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
          setAuthError(
            error.message
          );
        }
      } else {
        const {
          data,
          error,
        } =
          await supabase.auth.signUp({
            email,
            password,
          });

        if (error) {
          setAuthError(
            error.message
          );
        } else if (
          !data.session
        ) {
          setAuthMessage(
            "Account created. Please check your email to confirm your account."
          );
        }
      }
    } catch {
      setAuthError(
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>
          Loading CA Progress...
        </p>

        <style>{`
          .auth-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: #f7f8fb;
            color: #172033;
            font-family: Arial, sans-serif;
          }

          .auth-spinner {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 3px solid #dfe5f0;
            border-top-color: #2d68cf;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  /* =======================================================
     AUTH SCREEN
  ======================================================= */

  if (!session) {
    return (
      <>
        <div className="auth-page">
          <div className="auth-left">
            <div className="auth-brand">
              <div className="auth-logo">
                CA
              </div>

              <span>
                PROGRESS
              </span>
            </div>

            <div className="auth-hero">
              <div className="auth-badge">
                CA INTERMEDIATE
              </div>

              <h1>
                Your preparation.
                <br />
                <span>
                  Clearly tracked.
                </span>
              </h1>

              <p>
                Track chapters, revisions,
                tests and your preparation
                progress in one focused
                workspace.
              </p>

              <div className="auth-features">
                <AuthFeature
                  icon={
                    <BookOpen
                      size={18}
                    />
                  }
                  title="Track every chapter"
                  text="Stay organised across all subjects."
                />

                <AuthFeature
                  icon={
                    <LineChart
                      size={18}
                    />
                  }
                  title="See your progress"
                  text="Know exactly how far you have come."
                />

                <AuthFeature
                  icon={
                    <Target
                      size={18}
                    />
                  }
                  title="Stay consistent"
                  text="Build momentum every day."
                />
              </div>
            </div>

            <div className="auth-footer">
              Built for focused CA preparation.
            </div>
          </div>

          <div className="auth-right">
            <div className="auth-card">
              <div className="auth-card-head">
                <h2>
                  {authMode === "login"
                    ? "Welcome back"
                    : "Create your account"}
                </h2>

                <p>
                  {authMode === "login"
                    ? "Sign in to continue your preparation."
                    : "Start tracking your CA preparation today."}
                </p>
              </div>

              <form
                onSubmit={handleAuth}
                className="auth-form"
              >
                <label>
                  Email address

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    required
                  />
                </label>

                <label>
                  Password

                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    minLength={6}
                    required
                  />
                </label>

                {authError && (
                  <div className="auth-error">
                    {authError}
                  </div>
                )}

                {authMessage && (
                  <div className="auth-success">
                    {authMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Please wait..."
                    : authMode === "login"
                    ? "Sign in"
                    : "Create account"}
                </button>
              </form>

              <div className="auth-switch">
                {authMode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(
                      authMode === "login"
                        ? "signup"
                        : "login"
                    );

                    setAuthError("");
                    setAuthMessage("");
                  }}
                >
                  {authMode === "login"
                    ? "Create one"
                    : "Sign in"}
                </button>
              </div>

              {!supabase && (
                <div className="auth-config-warning">
                  Supabase environment variables
                  are missing.
                </div>
              )}
            </div>
          </div>
        </div>

        <AuthStyles />
      </>
    );
  }

  /* =======================================================
     TRACKER DASHBOARD
  ======================================================= */

  return (
    <TrackerDashboard
      email={
        session.user.email || ""
      }
      userId={
        session.user.id
      }
      onLogout={
        handleLogout
      }
    />
  );
}

/* =========================================================
   AUTH FEATURE
========================================================= */

function AuthFeature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="auth-feature">
      <div className="auth-feature-icon">
        {icon}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   TRACKER DASHBOARD
========================================================= */

function TrackerDashboard({
  email,
  userId,
  onLogout,
}: {
  email: string;
  userId: string;
  onLogout: () => void;
}) {
  const subjects =
    Object.keys(
      syllabus
    ) as SubjectName[];

  const allRows = useMemo(
    () =>
      subjects.flatMap(
        (subject) =>
          syllabus[subject].map(
            (chapter) => ({
              subject,
              chapter,
              key: keyFor(
                subject,
                chapter
              ),
            })
          )
      ),
    [subjects]
  );

  const [view, setView] =
    useState<View>(() => {
      if (typeof window === "undefined") return "Dashboard";
      const savedView = window.localStorage.getItem("ca-progress-view") as View | null;
      return menu.some((item) => item.label === savedView)
        ? savedView!
        : "Dashboard";
    });

  const [
    activeSubject,
    setActiveSubject,
  ] =
    useState<SubjectName>(
      subjects[0]
    );

  const [progress, setProgress] =
    useState<Progress>({});

  const [search, setSearch] =
    useState("");

  const [
    activities,
    setActivities,
  ] =
    useState<ActivityItem[]>(
      []
    );

  const [
    sidebarOpen,
    setSidebarOpen,
  ] =
    useState(false);

  const [toast, setToast] =
    useState("");

  const [
    studyHours,
    setStudyHours,
  ] =
    useState<number[]>(
      defaultStudyHours
    );

  const firstName =
    email
      ? email
          .split("@")[0]
          .replace(
            /^[a-z]/,
            (letter) =>
              letter.toUpperCase()
          )
      : "Student";

  const initial =
    firstName
      .charAt(0)
      .toUpperCase() || "C";

  /* =======================================================
     SUPABASE USER DATA
  ======================================================= */

  const dataReadyRef =
    useRef(false);

  const [dataReady, setDataReady] =
    useState(false);

  const [saveStatus, setSaveStatus] =
    useState<"idle" | "saving" | "saved" | "error">("idle");


  useEffect(() => {
    let cancelled = false;

    dataReadyRef.current = false;
    setDataReady(false);

    if (!supabase || !userId) {
      dataReadyRef.current = true;
      setDataReady(true);
      return;
    }

    const loadUserData = async () => {
      const { data, error } =
        await supabase
          .from("user_progress")
          .select("progress")
          .eq("user_id", userId)
          .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Unable to load progress:", error.message);
      } else if (data?.progress) {
        const saved = data.progress as {
          progress?: Progress;
          activities?: ActivityItem[];
          studyHours?: number[];
        };

        setProgress(saved.progress || {});
        setActivities(saved.activities || []);
        setStudyHours(saved.studyHours || defaultStudyHours);
      }

      dataReadyRef.current = true;
      setDataReady(true);
    };

    loadUserData();

    return () => {
      cancelled = true;
    };
  }, [userId]);






  const saveProgress = async () => {
    if (!supabase || !userId || !dataReady) return;
    setSaveStatus("saving");
    const { error } = await supabase.from("user_progress").upsert({
      user_id: userId,
      progress: { progress, activities, studyHours },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      console.error("Unable to save progress:", error.message);
      setSaveStatus("error");
      return;
    }
    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 1800);
  };

  useEffect(() => {
    window.localStorage.setItem("ca-progress-view", view);
  }, [view]);

  /* =======================================================
     STATS
  ======================================================= */

  const counts =
    useMemo(
      () =>
        Object.fromEntries(
          stages.map(
            (stage) => [
              stage.key,
              allRows.filter(
                (row) =>
                  progress[
                    row.key
                  ]?.[
                    stage.key
                  ]
              ).length,
            ]
          )
        ) as Record<
          Stage,
          number
        >,
      [
        allRows,
        progress,
      ]
    );

  const subjectStats = (
    subject: SubjectName
  ) => {
    const chapters =
      syllabus[subject];

    const done =
      chapters.filter(
        (chapter) =>
          progress[
            keyFor(
              subject,
              chapter
            )
          ]?.done
      ).length;

    return {
      total:
        chapters.length,

      done,

      percent:
        chapters.length
          ? Math.round(
              (done /
                chapters.length) *
                100
            )
          : 0,
    };
  };

  const overall =
    allRows.length
      ? Math.round(
          (counts.done /
            allRows.length) *
            100
        )
      : 0;

  /* =======================================================
     HELPERS
  ======================================================= */

  const flash = (
    message: string
  ) => {
    setToast(message);

    window.setTimeout(
      () => {
        setToast("");
      },
      1800
    );
  };

  const toggle = (
    subject: SubjectName,
    chapter: string,
    stage: Stage
  ) => {
    const key =
      keyFor(
        subject,
        chapter
      );

    const wasOn =
      Boolean(
        progress[key]?.[
          stage
        ]
      );

    setProgress(
      (current) => ({
        ...current,

        [key]: {
          ...current[key],

          [stage]:
            !wasOn,
        },
      })
    );

    if (!wasOn) {
      setActivities(
        (current) =>
          [
            {
              id:
                `${Date.now()}-${key}-${stage}`,

              chapter,

              subject,

              stage,

              time:
                "Just now",
            },

            ...current,
          ].slice(
            0,
            50
          )
      );


    }
  };

  const nav = (
    label: View
  ) => {
    setView(label);
    window.localStorage.setItem("ca-progress-view", label);

    setSidebarOpen(
      false
    );
  };

  return (
    <main className="app-shell">
      <aside
        className={`sidebar ${
          sidebarOpen
            ? "open"
            : ""
        }`}
      >
        <div className="brand">
          <span>
            CA
          </span>

          <small>
            PROGRESS
          </small>
        </div>

        <nav>
          {menu.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <button
                  key={
                    item.label
                  }
                  className={
                    view ===
                    item.label
                      ? "nav-item active"
                      : "nav-item"
                  }
                  onClick={() =>
                    nav(
                      item.label
                    )
                  }
                >
                  <Icon
                    size={18}
                  />

                  <span>
                    {item.label}
                  </span>
                </button>
              );
            }
          )}
        </nav>

        <button
          className="profile-card"
          onClick={() =>
            nav(
              "Settings"
            )
          }
        >
          <span className="avatar">
            {initial}
          </span>

          <span>
            <b>
              {firstName}
            </b>

            <small>
              CA Intermediate
            </small>
          </span>

          <ChevronRight
            size={15}
          />
        </button>
      </aside>

      {sidebarOpen && (
        <button
          className="backdrop"
          onClick={() =>
            setSidebarOpen(
              false
            )
          }
          aria-label="Close menu"
        />
      )}

      <section className="app-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() =>
              setSidebarOpen(
                true
              )
            }
          >
            <Menu
              size={22}
            />
          </button>

          <div className="hello">
            <h1>
              {view ===
              "Dashboard"
                ? `Hi, ${firstName}! 👋`
                : view}
            </h1>

            <p>
              {view ===
              "Dashboard"
                ? "Discipline today, success tomorrow."
                : "Track every step of your CA Intermediate preparation."}
            </p>
          </div>

          <div className="top-actions">
            <button className="icon-button">
              <Search
                size={19}
              />
            </button>

            <button className="icon-button">
              <Bell
                size={19}
              />
            </button>

            <button
              className="icon-button logout-button"
              onClick={onLogout}
              title="Logout"
            >
              <LogOut
                size={18}
              />
            </button>

            <button className="avatar large">
              {initial}
            </button>
          </div>
        </header>

        {view ===
          "Dashboard" && (
          <Dashboard
            subjects={
              subjects
            }
            overall={
              overall
            }
            counts={
              counts
            }
            total={
              allRows.length
            }
            subjectStats={
              subjectStats
            }
            activities={
              activities
            }
            studyHours={
              studyHours
            }
            onSubjects={() =>
              setView(
                "Subjects"
              )
            }
            onQuickStudy={() => {
              setStudyHours(
                (hours) => [
                  ...hours.slice(
                    0,
                    6
                  ),
                  Number(
                    (
                      hours[6] +
                      0.5
                    ).toFixed(1)
                  ),
                ]
              );

              flash(
                "30 minutes added to today"
              );
            }}
            onQuickTest={() => {
              setView(
                "Chapters"
              );

              flash(
                "Pick a chapter and mark its test complete"
              );
            }}
            onViewAll={() =>
              setView(
                "Activity"
              )
            }
          />
        )}

        {view ===
          "Subjects" && (
          <SubjectsView
            subjects={
              subjects
            }
            subjectStats={
              subjectStats
            }
            onOpen={(
              subject
            ) => {
              setActiveSubject(
                subject
              );

              setView(
                "Chapters"
              );
            }}
          />
        )}

        {view ===
          "Chapters" && (
          <ChaptersView
            subjects={
              subjects
            }
            activeSubject={
              activeSubject
            }
            setActiveSubject={
              setActiveSubject
            }
            search={
              search
            }
            setSearch={
              setSearch
            }
            progress={
              progress
            }
            toggle={
              toggle
            }
            subjectStats={
              subjectStats
            }
            onSaveProgress={
              saveProgress
            }
            saveStatus={
              saveStatus
            }
          />
        )}

        {view ===
          "Analytics" && (
          <AnalyticsView
            overall={
              overall
            }
            counts={
              counts
            }
            total={
              allRows.length
            }
            subjects={
              subjects
            }
            subjectStats={
              subjectStats
            }
            studyHours={
              studyHours
            }
          />
        )}

        {view ===
          "Activity" && (
          <ActivityView
            activities={
              activities
            }
          />
        )}

        {view ===
          "Settings" && (
          <SettingsView
            email={
              email
            }
            onLogout={
              onLogout
            }
          />
        )}

        {(
          [
            "Study Sessions",
            "Goals",
            "Test Series",
            "Calendar",
            "Notes",
          ] as View[]
        ).includes(
          view
        ) && (
          <ComingSoon
            view={
              view
            }
            onDashboard={() =>
              setView(
                "Dashboard"
              )
            }
          />
        )}
      </section>
    </main>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  subjects,
  overall,
  counts,
  total,
  subjectStats,
  activities,
  studyHours,
  onSubjects,
  onQuickStudy,
  onQuickTest,
  onViewAll,
}: any) {
  const recent =
    activities.length
      ? activities.slice(
          0,
          4
        )
      : [
          {
            id: "1",
            subject:
              "Advanced Accounting",
            chapter:
              "Accounting for Partnership Firms – Fundamentals",
            stage:
              "done",
            time:
              "Start here",
          },
          {
            id: "2",
            subject:
              "Corporate and Other Laws",
            chapter:
              "Indian Contract Act, 1872 – Essentials",
            stage:
              "revision1",
            time:
              "Track revisions",
          },
          {
            id: "3",
            subject:
              "Taxation",
            chapter:
              "Income Tax – Residential Status",
            stage:
              "revision2",
            time:
              "Stay consistent",
          },
          {
            id: "4",
            subject:
              "Cost and Management Accounting",
            chapter:
              "Marginal Costing",
            stage:
              "testDone",
            time:
              "Complete tests",
          },
        ];

  return (
    <>
      <div className="dashboard-head">
        <div className="exam-card">
          <CalendarDays
            size={28}
          />

          <div>
            <small>
              CA INTERMEDIATE EXAM
            </small>

            <div className="countdown">
              <b>
                152
                <span>
                  Days
                </span>
              </b>

              <b>
                12
                <span>
                  Hours
                </span>
              </b>

              <b>
                36
                <span>
                  Mins
                </span>
              </b>

              <b>
                25
                <span>
                  Secs
                </span>
              </b>
            </div>
          </div>
        </div>

        <div className="streak-card">
          <div className="flame">
            <Flame
              size={31}
            />
          </div>

          <div>
            <small>
              Daily Streak
            </small>

            <b>
              12{" "}
              <span>
                days
              </span>
            </b>

            <p>
              Keep it up! 🔥
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid top-grid">
        <section className="panel overall-card">
          <h3>
            Overall Progress
          </h3>

          <div className="overall-body">
            <ProgressRing
              value={
                overall
              }
            />

            <div className="metric-list">
              <Metric
                icon={
                  <BookOpen
                    size={16}
                  />
                }
                label="Total Chapters"
                value={
                  total
                }
              />

              <Metric
                icon={
                  <Check
                    size={16}
                  />
                }
                label="Chapters Done"
                value={
                  counts.done
                }
              />

              <Metric
                icon={
                  <NotebookPen
                    size={16}
                  />
                }
                label="1st Revision"
                value={
                  counts.revision1
                }
              />

              <Metric
                icon={
                  <NotebookPen
                    size={16}
                  />
                }
                label="2nd Revision"
                value={
                  counts.revision2
                }
              />

              <Metric
                icon={
                  <ClipboardCheck
                    size={16}
                  />
                }
                label="Tests Done"
                value={
                  counts.testDone
                }
              />
            </div>
          </div>
        </section>

        <section className="panel activity-progress">
          <h3>
            Progress by Activity
          </h3>

          {stages.map(
            (stage) => (
              <ProgressLine
                key={
                  stage.key
                }
                label={
                  stage.label
                }
                value={
                  total
                    ? Math.round(
                        (counts[
                          stage.key
                        ] /
                          total) *
                          100
                      )
                    : 0
                }
              />
            )
          )}
        </section>

        <section className="panel study-card">
          <h3>
            Study This Week
          </h3>

          <div className="study-total">
            {studyHours
              .reduce(
                (
                  a: number,
                  b: number
                ) => a + b,
                0
              )
              .toFixed(1)}
            h

            <small>
              Total Study Time
            </small>
          </div>

          <MiniLine
            data={
              studyHours
            }
          />
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel subject-panel">
          <div className="panel-heading">
            <h3>
              Subject Progress
            </h3>

            <button
              onClick={
                onSubjects
              }
            >
              View All
            </button>
          </div>

          {subjects.map(
            (
              subject: SubjectName
            ) => (
              <SubjectRow
                key={
                  subject
                }
                subject={
                  subject
                }
                stats={
                  subjectStats(
                    subject
                  )
                }
                onClick={
                  onSubjects
                }
              />
            )
          )}
        </section>

        <section className="panel recent-panel">
          <div className="panel-heading">
            <h3>
              Recent Activity
            </h3>

            <button
              onClick={
                onViewAll
              }
            >
              View All
            </button>
          </div>

          {recent.map(
            (
              item: ActivityItem
            ) => (
              <RecentRow
                key={
                  item.id
                }
                item={
                  item
                }
              />
            )
          )}
        </section>

        <section className="panel quick-panel">
          <h3>
            Quick Actions
          </h3>

          <div className="quick-grid">
            <button
              onClick={
                onQuickStudy
              }
            >
              <Clock3 />

              <span>
                Start Study Session
              </span>
            </button>

            <button
              onClick={
                onQuickTest
              }
            >
              <ClipboardCheck />

              <span>
                Take a Test
              </span>
            </button>

            <button>
              <Goal />

              <span>
                Add Goal
              </span>
            </button>

            <button>
              <CalendarDays />

              <span>
                View Calendar
              </span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

/* =========================================================
   SUBJECTS
========================================================= */

function SubjectsView({
  subjects,
  subjectStats,
  onOpen,
}: {
  subjects: SubjectName[];
  subjectStats: (
    subject: SubjectName
  ) => {
    total: number;
    done: number;
    percent: number;
  };
  onOpen: (
    subject: SubjectName
  ) => void;
}) {
  return (
    <section className="single-page">
      <div className="page-heading">
        <div>
          <h2>
            Subjects
          </h2>

          <p>
            Track your progress
            subject-wise.
          </p>
        </div>

        <button className="search-lite">
          <Search
            size={15}
          />

          Search subjects
        </button>
      </div>

      <div className="subject-list-full">
        {subjects.map(
          (subject) => (
            <SubjectRow
              key={
                subject
              }
              subject={
                subject
              }
              stats={
                subjectStats(
                  subject
                )
              }
              onClick={() =>
                onOpen(
                  subject
                )
              }
            />
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   CHAPTERS
========================================================= */

function ChaptersView({
  subjects,
  activeSubject,
  setActiveSubject,
  search,
  setSearch,
  progress,
  toggle,
  subjectStats,
  onSaveProgress,
  saveStatus,
}: {
  subjects: SubjectName[];
  activeSubject: SubjectName;
  setActiveSubject: (
    subject: SubjectName
  ) => void;
  search: string;
  setSearch: (
    value: string
  ) => void;
  progress: Progress;
  toggle: (
    subject: SubjectName,
    chapter: string,
    stage: Stage
  ) => void;
  subjectStats: (
    subject: SubjectName
  ) => {
    total: number;
    done: number;
    percent: number;
  };
  onSaveProgress: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}) {
  const rows =
    syllabus[
      activeSubject
    ].filter(
      (chapter) =>
        chapter
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  const stats =
    subjectStats(
      activeSubject
    );

  return (
    <section className="chapters-page">
      <div className="chapter-top">
        <div>
          <button className="back-link">
            ‹ Back to Subjects
          </button>

          <h2>
            {
              subjectMeta[
                activeSubject
              ].short
            }
          </h2>

          <div className="chapter-progress">
            <span
              style={{
                width:
                  `${stats.percent}%`,
              }}
            />

            <b>
              {stats.percent}%
            </b>
          </div>
        </div>

        <select
          value={
            activeSubject
          }
          onChange={(
            event
          ) =>
            setActiveSubject(
              event.target
                .value as SubjectName
            )
          }
        >
          {subjects.map(
            (subject) => (
              <option
                key={
                  subject
                }
              >
                {subject}
              </option>
            )
          )}
        </select>
      </div>

      <div className="chapter-toolbar">
        <div className="table-label">
          {rows.length} Chapters
        </div>

        <div
          className="chapter-toolbar-actions"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px",
            flexWrap: "nowrap",
          }}
        >
          <label
            style={{
              margin: 0,
              minWidth: "272px",
            }}
          >
            <Search
              size={16}
            />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search chapters"
            />
          </label>

          <button
            type="button"
            className={`chapter-save-button ${saveStatus}`}
            onClick={onSaveProgress}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "Saved ✓"
                : saveStatus === "error"
                  ? "Try Again"
                  : "Save Progress"}
          </button>
        </div>
      </div>

      <div className="chapter-table">
        <div className="chapter-head">
          <span>
            # &nbsp; Chapter Name
          </span>

          {stages.map(
            (stage) => (
              <span
                key={
                  stage.key
                }
              >
                {
                  stage.short
                }
              </span>
            )
          )}
        </div>

        {rows.map(
          (
            chapter,
            index
          ) => {
            const key =
              keyFor(
                activeSubject,
                chapter
              );

            return (
              <div
                className="chapter-row"
                key={
                  chapter
                }
              >
                <span>
                  <b>
                    {index + 1}
                  </b>

                  {chapter}
                </span>

                {stages.map(
                  (stage) => (
                    <button
                      key={
                        stage.key
                      }
                      title={
                        stage.label
                      }
                      className={`stage-dot ${
                        progress[
                          key
                        ]?.[
                          stage.key
                        ]
                          ? `on ${stage.key}`
                          : ""
                      }`}
                      onClick={() =>
                        toggle(
                          activeSubject,
                          chapter,
                          stage.key
                        )
                      }
                    >
                      {progress[
                        key
                      ]?.[
                        stage.key
                      ] && (
                        <Check
                          size={
                            13
                          }
                        />
                      )}
                    </button>
                  )
                )}
              </div>
            );
          }
        )}
      </div>

      <div className="status-legend">
        {stages.map(
          (stage) => (
            <span
              key={
                stage.key
              }
              className={
                stage.key
              }
            >
              <i />

              {
                stage.label
              }
            </span>
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

function AnalyticsView({
  overall,
  counts,
  total,
  subjects,
  subjectStats,
  studyHours,
}: any) {
  const totalHours =
    studyHours.reduce(
      (
        a: number,
        b: number
      ) => a + b,
      0
    );

  return (
    <section className="analytics-page">
      <div className="page-heading">
        <div>
          <h2>
            Analytics
          </h2>

          <p>
            Detailed insights into
            your preparation.
          </p>
        </div>

        <button className="select-btn">
          This Week⌄
        </button>
      </div>

      <div className="analytics-stats">
        <Metric
          icon={
            <Clock3 />
          }
          label="Study Time"
          value={`${totalHours.toFixed(
            1
          )}h`}
        />

        <Metric
          icon={
            <Activity />
          }
          label="Study Sessions"
          value="7"
        />

        <Metric
          icon={
            <Clock3 />
          }
          label="Daily Average"
          value={`${(
            totalHours / 7
          ).toFixed(1)}h`}
        />

        <Metric
          icon={
            <Trophy />
          }
          label="Goal Completion"
          value={`${overall}%`}
        />
      </div>

      <div className="analytics-grid">
        <section className="panel chart-panel">
          <h3>
            Study Time Trend
          </h3>

          <MiniLine
            data={
              studyHours
            }
            tall
          />
        </section>

        <section className="panel donut-panel">
          <h3>
            Progress by Subject
          </h3>

          <div className="donut-content">
            <ProgressRing
              value={
                overall
              }
            />

            <div>
              {subjects.map(
                (
                  subject: SubjectName
                ) => (
                  <div
                    className="legend-subject"
                    key={
                      subject
                    }
                  >
                    <i
                      style={{
                        background:
                          subjectMeta[
                            subject
                          ].color,
                      }}
                    />

                    <span>
                      {
                        subjectMeta[
                          subject
                        ].short
                      }
                    </span>

                    <b>
                      {
                        subjectStats(
                          subject
                        ).percent
                      }
                      %
                    </b>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="panel analytics-progress">
        <h3>
          Completion Overview
        </h3>

        {stages.map(
          (stage) => (
            <ProgressLine
              key={
                stage.key
              }
              label={
                stage.label
              }
              value={
                total
                  ? Math.round(
                      (counts[
                        stage.key
                      ] /
                        total) *
                        100
                    )
                  : 0
              }
            />
          )
        )}
      </section>
    </section>
  );
}

/* =========================================================
   ACTIVITY
========================================================= */

function ActivityView({
  activities,
}: {
  activities: ActivityItem[];
}) {
  return (
    <section className="single-page">
      <div className="page-heading">
        <div>
          <h2>
            Activity
          </h2>

          <p>
            A history of your completed
            study milestones.
          </p>
        </div>
      </div>

      <section className="panel activity-full">
        {activities.length ? (
          activities.map(
            (item) => (
              <RecentRow
                key={
                  item.id
                }
                item={
                  item
                }
              />
            )
          )
        ) : (
          <div className="empty">
            <Activity
              size={28}
            />

            <h3>
              No activity yet
            </h3>

            <p>
              Mark a chapter,
              revision, or test
              complete to see it here.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsView({
  email,
  onLogout,
}: {
  email: string;
  onLogout: () => void;
}) {
  return (
    <section className="single-page">
      <div className="page-heading">
        <div>
          <h2>
            Settings
          </h2>

          <p>
            Manage your account.
          </p>
        </div>
      </div>

      <section className="panel settings-account">
        <div className="settings-avatar">
          {email
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <h3>
            Account
          </h3>

          <p>
            {email}
          </p>
        </div>

        <button
          className="settings-logout"
          onClick={
            onLogout
          }
        >
          <LogOut
            size={17}
          />

          Logout
        </button>
      </section>
    </section>
  );
}

/* =========================================================
   COMING SOON
========================================================= */

function ComingSoon({
  view,
  onDashboard,
}: {
  view: View;
  onDashboard: () => void;
}) {
  return (
    <section className="coming-soon panel">
      <div className="coming-icon">
        <Plus
          size={24}
        />
      </div>

      <h2>
        {view}
      </h2>

      <p>
        This section is ready for
        the next build phase.
        The dashboard and chapter
        tracker are already functional.
      </p>

      <button
        onClick={
          onDashboard
        }
      >
        Back to Dashboard
      </button>
    </section>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SubjectRow({
  subject,
  stats,
  onClick,
}: {
  subject: SubjectName;
  stats: {
    total: number;
    done: number;
    percent: number;
  };
  onClick: () => void;
}) {
  const meta =
    subjectMeta[
      subject
    ];

  return (
    <button
      className="subject-row-new"
      onClick={
        onClick
      }
    >
      <span
        className="subject-badge"
        style={{
          background:
            meta.color,
        }}
      >
        {meta.code}
      </span>

      <span className="subject-name">
        {meta.short}
      </span>

      <span className="subject-bar">
        <i
          style={{
            width:
              `${stats.percent}%`,
          }}
        />
      </span>

      <b>
        {stats.percent}%
      </b>

      <small>
        {stats.done}/
        {stats.total}
      </small>

      <ChevronRight
        size={17}
      />
    </button>
  );
}

function RecentRow({
  item,
}: {
  item: ActivityItem;
}) {
  const meta =
    subjectMeta[
      item.subject as SubjectName
    ];

  const stage =
    stages.find(
      (
        itemStage
      ) =>
        itemStage.key ===
        item.stage
    );

  return (
    <div className="recent-row">
      <span
        className="subject-badge"
        style={{
          background:
            meta?.color ||
            "#5b6fd6",
        }}
      >
        {meta?.code ||
          "CA"}
      </span>

      <span className="recent-copy">
        <b>
          {item.chapter}
        </b>

        <small>
          {
            stageCopy[
              item.stage
            ]
          }
        </small>
      </span>

      <span
        className={`activity-status ${
          item.stage
        }`}
      >
        {
          stage?.short
        }
      </span>

      <time>
        {item.time}
      </time>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="metric">
      <i>
        {icon}
      </i>

      <span>
        {label}
      </span>

      <b>
        {value}
      </b>
    </div>
  );
}

function ProgressLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="progress-line">
      <span>
        {label}
      </span>

      <div>
        <i
          style={{
            width:
              `${value}%`,
          }}
        />
      </div>

      <b>
        {value}%
      </b>
    </div>
  );
}

function ProgressRing({
  value,
}: {
  value: number;
}) {
  return (
    <div
      className="progress-ring"
      style={{
        background:
          `conic-gradient(
            #2d68cf ${value}%,
            #e9edf3 0
          )`,
      }}
    >
      <div>
        <b>
          {value}%
        </b>

        <span>
          Completed
        </span>
      </div>
    </div>
  );
}

function MiniLine({
  data,
  tall = false,
}: {
  data: number[];
  tall?: boolean;
}) {
  const max =
    Math.max(
      ...data,
      1
    );

  const points =
    data
      .map(
        (
          value,
          index
        ) =>
          `${index *
            (100 /
              (data.length -
                1))},${
            100 -
            (value /
              max) *
              75 -
            5
          }`
      )
      .join(" ");

  return (
    <div
      className={`mini-line ${
        tall
          ? "tall"
          : ""
      }`}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="fill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#2d68cf"
              stopOpacity=".18"
            />

            <stop
              offset="100%"
              stopColor="#2d68cf"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#fill)"
        />

        <polyline
          points={
            points
          }
          fill="none"
          stroke="#2d68cf"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="days">
        {[
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
          "Sun",
        ].map(
          (day) => (
            <span
              key={
                day
              }
            >
              {day}
            </span>
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   AUTH STYLES
========================================================= */

function AuthStyles() {
  return (
    <style>{`
      .auth-page {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        background: #f7f8fb;
        font-family: Arial, sans-serif;
      }

      .auth-left {
        min-height: 100vh;
        padding: 42px 8vw;
        background:
          radial-gradient(
            circle at 20% 20%,
            rgba(92, 116, 215, 0.15),
            transparent 30%
          ),
          linear-gradient(
            135deg,
            #101a31,
            #17274b
          );
        color: white;
        display: flex;
        flex-direction: column;
      }

      .auth-brand {
        display: flex;
        align-items: center;
        gap: 11px;
        font-size: 13px;
        letter-spacing: 2px;
        font-weight: 700;
      }

      .auth-logo {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #ffffff;
        color: #1b3d83;
        font-size: 17px;
        font-weight: 800;
        letter-spacing: -1px;
      }

      .auth-hero {
        margin: auto 0;
        max-width: 570px;
      }

      .auth-badge {
        display: inline-flex;
        padding: 8px 12px;
        border: 1px solid rgba(255,255,255,.16);
        background: rgba(255,255,255,.07);
        border-radius: 999px;
        font-size: 11px;
        letter-spacing: 1.3px;
        margin-bottom: 26px;
      }

      .auth-hero h1 {
        margin: 0;
        font-size: clamp(42px, 5vw, 72px);
        line-height: 1.02;
        letter-spacing: -3px;
      }

      .auth-hero h1 span {
        color: #9fb9ff;
      }

      .auth-hero > p {
        max-width: 480px;
        margin: 24px 0 38px;
        color: #b7c1d7;
        line-height: 1.7;
        font-size: 16px;
      }

      .auth-features {
        display: grid;
        gap: 17px;
      }

      .auth-feature {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .auth-feature-icon {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 11px;
        color: #a9c0ff;
      }

      .auth-feature strong,
      .auth-feature span {
        display: block;
      }

      .auth-feature strong {
        font-size: 14px;
        margin-bottom: 3px;
      }

      .auth-feature span {
        color: #aab6cf;
        font-size: 13px;
      }

      .auth-footer {
        color: #7584a3;
        font-size: 12px;
      }

      .auth-right {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
      }

      .auth-card {
        width: 100%;
        max-width: 430px;
        background: white;
        border: 1px solid #e8ebf1;
        border-radius: 22px;
        padding: 42px;
        box-shadow: 0 20px 70px rgba(25, 38, 68, .08);
      }

      .auth-card-head h2 {
        margin: 0;
        color: #182033;
        font-size: 30px;
        letter-spacing: -1px;
      }

      .auth-card-head p {
        margin: 9px 0 30px;
        color: #7c8595;
        line-height: 1.6;
        font-size: 14px;
      }

      .auth-form {
        display: grid;
        gap: 17px;
      }

      .auth-form label {
        display: grid;
        gap: 8px;
        color: #4d5564;
        font-size: 13px;
        font-weight: 600;
      }

      .auth-form input {
        width: 100%;
        box-sizing: border-box;
        height: 48px;
        border: 1px solid #dfe3eb;
        border-radius: 11px;
        padding: 0 14px;
        outline: none;
        font-size: 14px;
        transition: .2s;
      }

      .auth-form input:focus {
        border-color: #2d68cf;
        box-shadow: 0 0 0 4px rgba(45,104,207,.08);
      }

      .auth-submit {
        height: 50px;
        border: 0;
        border-radius: 11px;
        background: #245ec2;
        color: white;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        margin-top: 4px;
      }

      .auth-submit:hover {
        background: #1d51aa;
      }

      .auth-submit:disabled {
        opacity: .65;
        cursor: not-allowed;
      }

      .auth-switch {
        margin-top: 25px;
        text-align: center;
        color: #778092;
        font-size: 13px;
      }

      .auth-switch button {
        border: 0;
        background: none;
        color: #245ec2;
        font-weight: 700;
        margin-left: 6px;
        cursor: pointer;
      }

      .auth-error,
      .auth-success,
      .auth-config-warning {
        padding: 11px 13px;
        border-radius: 9px;
        font-size: 12px;
        line-height: 1.5;
      }

      .auth-error {
        background: #fff1f1;
        color: #b3261e;
        border: 1px solid #ffd7d5;
      }

      .auth-success {
        background: #effaf3;
        color: #18703b;
        border: 1px solid #ccebd6;
      }

      .auth-config-warning {
        margin-top: 20px;
        background: #fff8e8;
        color: #8a6316;
      }

      .chapter-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .chapter-toolbar {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        flex-wrap: nowrap !important;
      }

      .chapter-toolbar-actions {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 10px !important;
        width: 100%;
        min-width: 0;
      }
      .chapter-toolbar-actions label {
        display: flex !important;
        align-items: center !important;
        flex: 1 1 auto;
        min-width: 0 !important;
        margin: 0 !important;
      }
      .chapter-toolbar-actions input {
        min-width: 0 !important;
        width: 100%;
      }
      button.chapter-save-button {
        appearance: none !important;
        -webkit-appearance: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 auto !important;
        min-width: 132px !important;
        height: 40px !important;
        padding: 0 18px !important;
        border: none !important;
        border-radius: 9px !important;
        background: #3568b8 !important;
        color: #fff !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        white-space: nowrap !important;
        cursor: pointer;
      }
      button.chapter-save-button.saved { background: #2f8a63 !important; }
      button.chapter-save-button.error { background: #c2413b !important; }
      button.chapter-save-button:disabled { opacity: .75; cursor: wait; }

      @media (max-width: 720px) {
        .chapter-toolbar-actions {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 8px !important;
          width: 100% !important;
        }
        .chapter-toolbar-actions label {
          flex: 1 1 auto !important;
          min-width: 0 !important;
        }
        button.chapter-save-button {
          flex: 0 0 auto !important;
          min-width: 126px !important;
          height: 40px !important;
          padding: 0 14px !important;
        }
      }

      .logout-button {
        color: #d44b4b;
      }

      .settings-account {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px;
      }

      .settings-account h3 {
        margin: 0 0 5px;
      }

      .settings-account p {
        margin: 0;
        color: #7a8290;
      }

      .settings-avatar {
        width: 50px;
        height: 50px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #e9efff;
        color: #245ec2;
        font-weight: 800;
      }

      .settings-logout {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #f1d6d6;
        background: #fff;
        color: #c94a4a;
        padding: 10px 14px;
        border-radius: 9px;
        cursor: pointer;
      }

      @media (max-width: 850px) {
        .auth-page {
          grid-template-columns: 1fr;
        }

        .auth-left {
          min-height: auto;
          padding: 32px 24px 50px;
        }

        .auth-hero {
          margin: 65px 0 0;
        }

        .auth-hero h1 {
          font-size: 48px;
        }

        .auth-footer {
          display: none;
        }

        .auth-right {
          padding: 28px 18px 40px;
        }

        .auth-card {
          padding: 30px 22px;
        }
      }
    `}</style>
  );
