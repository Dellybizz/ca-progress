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

export type Stage = "done" | "revision1" | "revision2" | "testDone";
export type Progress = Record<string, Partial<Record<Stage, boolean>>>;
export type ActivityItem = { id: string; chapter: string; subject: string; stage: Stage; time: string };
export type StudySessionItem = { id: string; subject: SubjectName; minutes: number; date: string };
export type GoalItem = { id: string; title: string; dueDate: string; completed: boolean };
export type TestItem = { id: string; subject: SubjectName; score: number; maxScore: number; date: string };
export type CalendarItem = { id: string; title: string; date: string };
export type NoteItem = { id: string; title: string; body: string; updatedAt: string };
export type SaveStatus = "idle" | "saving" | "saved" | "error";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const defaultStudyHours = [1.2, 2.1, 1.6, 2.8, 2.4, 3.5, 4.5];

type ProgressContextValue = {
  session: Session | null;
  authLoading: boolean;
  dataReady: boolean;
  guestMode: boolean;
  configured: boolean;
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
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
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
  const dataReadyRef = useRef(false);

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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession) setGuestMode(false);
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
        if (error) console.error("Unable to load progress:", error.message);
        const saved = data?.progress as Partial<{
          progress: Progress;
          activities: ActivityItem[];
          studyHours: number[];
          studySessions: StudySessionItem[];
          goals: GoalItem[];
          tests: TestItem[];
          calendarItems: CalendarItem[];
          notes: NoteItem[];
        }> | undefined;
        setProgress(saved?.progress || {});
        setActivities(saved?.activities || []);
        setStudyHours(saved?.studyHours || defaultStudyHours);
        setStudySessions(saved?.studySessions || []);
        setGoals(saved?.goals || []);
        setTests(saved?.tests || []);
        setCalendarItems(saved?.calendarItems || []);
        setNotes(saved?.notes || []);
        dataReadyRef.current = true;
        setDataReady(true);
      });
    return () => { cancelled = true; };
  }, [session?.user.id]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return "Supabase is not configured. Check your Vercel environment variables.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message || null;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase is not configured. Check your Vercel environment variables.", needsConfirmation: false };
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message || null, needsConfirmation: !error && !data.session };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const saveProgress = async () => {
    if (!supabase || !session?.user.id || !dataReadyRef.current) return;
    setSaveStatus("saving");
    const { error } = await supabase.from("user_progress").upsert({
      user_id: session.user.id,
      progress: { progress, activities, studyHours, studySessions, goals, tests, calendarItems, notes },
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

  return (
    <ProgressContext.Provider value={{
      session, authLoading, dataReady, guestMode, configured: Boolean(supabase),
      progress, setProgress, activities, setActivities, studyHours, setStudyHours,
      studySessions, setStudySessions, goals, setGoals, tests, setTests,
      calendarItems, setCalendarItems, notes, setNotes, saveStatus,
      signIn, signUp, signOut,
      continueAsGuest: () => setGuestMode(true),
      requireAuth: () => setGuestMode(false),
      saveProgress,
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside ProgressProvider");
  return value;
}
