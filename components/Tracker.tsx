"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, BookOpen, CalendarDays, Check, ChevronRight, ClipboardCheck,
  Clock3, FileText, Flame, Goal, Home, LineChart, Menu, NotebookPen,
  Plus, Search, Settings, Target, Trophy
} from "lucide-react";
import { syllabus, SubjectName } from "@/lib/syllabus";

type Stage = "done" | "revision1" | "revision2" | "testDone";
type Progress = Record<string, Partial<Record<Stage, boolean>>>;
type ActivityItem = { id: string; chapter: string; subject: string; stage: Stage; time: string };
type View = "Dashboard" | "Subjects" | "Chapters" | "Analytics" | "Study Sessions" | "Goals" | "Test Series" | "Calendar" | "Activity" | "Notes" | "Settings";

const stages: { key: Stage; label: string; short: string }[] = [
  { key: "done", label: "Chapter Done", short: "Done" },
  { key: "revision1", label: "1st Revision", short: "1R" },
  { key: "revision2", label: "2nd Revision", short: "2R" },
  { key: "testDone", label: "Test Done", short: "Test" },
];

const menu: { label: View; icon: typeof Home }[] = [
  { label: "Dashboard", icon: Home }, { label: "Subjects", icon: BookOpen },
  { label: "Chapters", icon: NotebookPen }, { label: "Analytics", icon: LineChart },
  { label: "Study Sessions", icon: Clock3 }, { label: "Goals", icon: Target },
  { label: "Test Series", icon: ClipboardCheck }, { label: "Calendar", icon: CalendarDays },
  { label: "Activity", icon: Activity }, { label: "Notes", icon: FileText },
  { label: "Settings", icon: Settings },
];

const subjectMeta: Record<SubjectName, { code: string; color: string; short: string }> = {
  "Advanced Accounting": { code: "AA", color: "#5b6fd6", short: "Advanced Accounting" },
  "Corporate and Other Laws": { code: "CL", color: "#d94c8a", short: "Corporate & Other Laws" },
  "Taxation": { code: "TX", color: "#f19a35", short: "Taxation" },
  "Cost and Management Accounting": { code: "CM", color: "#3e84c7", short: "Cost & Management A/c" },
  "Auditing and Ethics": { code: "AE", color: "#46a597", short: "Auditing & Ethics" },
  "Financial Management & Strategic Management": { code: "FM", color: "#2f78bd", short: "Financial Management" },
};

const keyFor = (subject: string, chapter: string) => `${subject}::${chapter}`;
const stageCopy: Record<Stage, string> = {
  done: "Marked as Done", revision1: "1st Revision Completed", revision2: "2nd Revision Completed", testDone: "Test Completed"
};

export default function Tracker() {
  const subjects = Object.keys(syllabus) as SubjectName[];
  const allRows = useMemo(() => subjects.flatMap(subject => syllabus[subject].map(chapter => ({ subject, chapter, key: keyFor(subject, chapter) }))), [subjects]);
  const [view, setView] = useState<View>("Dashboard");
  const [activeSubject, setActiveSubject] = useState<SubjectName>(subjects[0]);
  const [progress, setProgress] = useState<Progress>({});
  const [search, setSearch] = useState("");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [studyHours, setStudyHours] = useState([1.2, 2.1, 1.6, 2.8, 2.4, 3.5, 4.5]);

  useEffect(() => {
    const saved = window.localStorage.getItem("ca-progress-data-v2");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setProgress(data.progress || {});
        setActivities(data.activities || []);
        setStudyHours(data.studyHours || [1.2, 2.1, 1.6, 2.8, 2.4, 3.5, 4.5]);
      } catch { /* ignore malformed local data */ }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ca-progress-data-v2", JSON.stringify({ progress, activities, studyHours }));
  }, [progress, activities, studyHours]);

  const counts = useMemo(() => Object.fromEntries(stages.map(s => [s.key, allRows.filter(r => progress[r.key]?.[s.key]).length])) as Record<Stage, number>, [allRows, progress]);
  const subjectStats = (subject: SubjectName) => {
    const chapters = syllabus[subject];
    const done = chapters.filter(ch => progress[keyFor(subject, ch)]?.done).length;
    return { total: chapters.length, done, percent: chapters.length ? Math.round(done / chapters.length * 100) : 0 };
  };
  const overall = allRows.length ? Math.round(counts.done / allRows.length * 100) : 0;

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const toggle = (subject: SubjectName, chapter: string, stage: Stage) => {
    const key = keyFor(subject, chapter);
    const wasOn = !!progress[key]?.[stage];
    setProgress(current => ({ ...current, [key]: { ...current[key], [stage]: !wasOn } }));
    if (!wasOn) {
      setActivities(current => [{ id: `${Date.now()}-${key}-${stage}`, chapter, subject, stage, time: "Just now" }, ...current].slice(0, 50));
      flash(stageCopy[stage]);
    }
  };

  const nav = (label: View) => { setView(label); setSidebarOpen(false); };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand"><span>CA</span><small>PROGRESS</small></div>
        <nav>
          {menu.map(item => {
            const Icon = item.icon;
            return <button key={item.label} className={view === item.label ? "nav-item active" : "nav-item"} onClick={() => nav(item.label)}><Icon size={18}/><span>{item.label}</span></button>;
          })}
        </nav>
        <button className="profile-card" onClick={() => flash("Profile settings coming next")}> <span className="avatar">Z</span><span><b>Zaid</b><small>CA Intermediate</small></span><ChevronRight size={15}/></button>
      </aside>
      {sidebarOpen && <button className="backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close menu"/>}

      <section className="app-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={22}/></button>
          <div className="hello"><h1>{view === "Dashboard" ? "Hi, Zaid! 👋" : view}</h1><p>{view === "Dashboard" ? "Discipline today, success tomorrow." : "Track every step of your CA Intermediate preparation."}</p></div>
          <div className="top-actions"><button className="icon-button"><Search size={19}/></button><button className="icon-button"><Bell size={19}/></button><button className="avatar large">Z</button></div>
        </header>

        {view === "Dashboard" && <Dashboard
          subjects={subjects} overall={overall} counts={counts} total={allRows.length}
          subjectStats={subjectStats} activities={activities} studyHours={studyHours}
          onSubjects={() => setView("Subjects")} onQuickStudy={() => { setStudyHours(h => [...h.slice(0, 6), +(h[6] + .5).toFixed(1)]); flash("30 minutes added to today"); }}
          onQuickTest={() => { setView("Chapters"); flash("Pick a chapter and mark its test complete"); }}
          onViewAll={() => setView("Activity")}
        />}
        {view === "Subjects" && (   <SubjectsView     subjects={subjects}     subjectStats={subjectStats}     onOpen={(subject: string) => {       setActiveSubject(subject);       setView("Chapters");     }}   /> )} 
        {view === "Chapters" && <ChaptersView subjects={subjects} activeSubject={activeSubject} setActiveSubject={setActiveSubject} search={search} setSearch={setSearch} progress={progress} toggle={toggle} subjectStats={subjectStats}/>} 
        {view === "Analytics" && <AnalyticsView overall={overall} counts={counts} total={allRows.length} subjects={subjects} subjectStats={subjectStats} studyHours={studyHours}/>} 
        {view === "Activity" && <ActivityView activities={activities}/>} 
        {(["Study Sessions", "Goals", "Test Series", "Calendar", "Notes", "Settings"] as View[]).includes(view) && <ComingSoon view={view} onDashboard={() => setView("Dashboard")}/>} 
      </section>
      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </main>
  );
}

function Dashboard({ subjects, overall, counts, total, subjectStats, activities, studyHours, onSubjects, onQuickStudy, onQuickTest, onViewAll }: any) {
  const recent = activities.length ? activities.slice(0, 4) : [
    { id: "1", subject: "Advanced Accounting", chapter: "Accounting for Partnership Firms – Fundamentals", stage: "done", time: "Start here" },
    { id: "2", subject: "Corporate and Other Laws", chapter: "Indian Contract Act, 1872 – Essentials", stage: "revision1", time: "Track revisions" },
    { id: "3", subject: "Taxation", chapter: "Income Tax – Residential Status", stage: "revision2", time: "Stay consistent" },
    { id: "4", subject: "Cost and Management Accounting", chapter: "Marginal Costing", stage: "testDone", time: "Complete tests" },
  ];
  return <>
    <div className="dashboard-head">
      <div className="exam-card"><CalendarDays size={28}/><div><small>CA INTERMEDIATE EXAM</small><div className="countdown"><b>152<span>Days</span></b><b>12<span>Hours</span></b><b>36<span>Mins</span></b><b>25<span>Secs</span></b></div></div></div>
      <div className="streak-card"><div className="flame"><Flame size={31}/></div><div><small>Daily Streak</small><b>12 <span>days</span></b><p>Keep it up! 🔥</p></div></div>
    </div>

    <div className="dashboard-grid top-grid">
      <section className="panel overall-card">
        <h3>Overall Progress</h3>
        <div className="overall-body"><ProgressRing value={overall}/><div className="metric-list">
          <Metric icon={<BookOpen size={16}/>} label="Total Chapters" value={total}/><Metric icon={<Check size={16}/>} label="Chapters Done" value={counts.done}/>
          <Metric icon={<NotebookPen size={16}/>} label="1st Revision" value={counts.revision1}/><Metric icon={<NotebookPen size={16}/>} label="2nd Revision" value={counts.revision2}/><Metric icon={<ClipboardCheck size={16}/>} label="Tests Done" value={counts.testDone}/>
        </div></div>
      </section>
      <section className="panel activity-progress"><h3>Progress by Activity</h3>{stages.map(s => <ProgressLine key={s.key} label={s.label} value={total ? Math.round(counts[s.key] / total * 100) : 0}/>)}</section>
      <section className="panel study-card"><h3>Study This Week</h3><div className="study-total">{studyHours.reduce((a:number,b:number)=>a+b,0).toFixed(1)}h <small>Total Study Time</small></div><MiniLine data={studyHours}/></section>
    </div>

    <div className="dashboard-grid lower-grid">
      <section className="panel subject-panel"><div className="panel-heading"><h3>Subject Progress</h3><button onClick={onSubjects}>View All</button></div>{subjects.map((subject: SubjectName) => <SubjectRow key={subject} subject={subject} stats={subjectStats(subject)} onClick={onSubjects}/>)}</section>
      <section className="panel recent-panel"><div className="panel-heading"><h3>Recent Activity</h3><button onClick={onViewAll}>View All</button></div>{recent.map((item:any) => <RecentRow key={item.id} item={item}/>)}</section>
      <section className="panel quick-panel"><h3>Quick Actions</h3><div className="quick-grid"><button onClick={onQuickStudy}><Clock3/><span>Start Study Session</span></button><button onClick={onQuickTest}><ClipboardCheck/><span>Take a Test</span></button><button><Goal/><span>Add Goal</span></button><button><CalendarDays/><span>View Calendar</span></button></div></section>
    </div>
  </>;
}

function SubjectsView({ subjects, subjectStats, onOpen }: any) { return <section className="single-page"><div className="page-heading"><div><h2>Subjects</h2><p>Track your progress subject-wise.</p></div><button className="search-lite"><Search size={15}/> Search subjects</button></div><div className="subject-list-full">{subjects.map((subject:SubjectName) => <SubjectRow key={subject} subject={subject} stats={subjectStats(subject)} onClick={() => onOpen(subject)}/>)}</div></section>; }

function ChaptersView({ subjects, activeSubject, setActiveSubject, search, setSearch, progress, toggle, subjectStats }: any) {
  const rows = syllabus[activeSubject].filter(ch => ch.toLowerCase().includes(search.toLowerCase()));
  return <section className="chapters-page"><div className="chapter-top"><div><button className="back-link">‹ Back to Subjects</button><h2>{subjectMeta[activeSubject].short}</h2><div className="chapter-progress"><span style={{ width: `${subjectStats(activeSubject).percent}%` }}/><b>{subjectStats(activeSubject).percent}%</b></div></div><select value={activeSubject} onChange={e => setActiveSubject(e.target.value as SubjectName)}>{subjects.map((s:SubjectName)=><option key={s}>{s}</option>)}</select></div><div className="chapter-toolbar"><div className="table-label">{rows.length} Chapters</div><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chapters"/></label></div><div className="chapter-table"><div className="chapter-head"><span># &nbsp; Chapter Name</span>{stages.map(s=><span key={s.key}>{s.short}</span>)}</div>{rows.map((chapter:string,index:number)=>{const key=keyFor(activeSubject,chapter);return <div className="chapter-row" key={chapter}><span><b>{index+1}</b>{chapter}</span>{stages.map(s=><button key={s.key} title={s.label} className={`stage-dot ${progress[key]?.[s.key]?`on ${s.key}`:""}`} onClick={()=>toggle(activeSubject,chapter,s.key)}>{progress[key]?.[s.key]&&<Check size={13}/>}</button>)}</div>})}</div><div className="status-legend">{stages.map(s=><span key={s.key} className={s.key}><i/>{s.label}</span>)}</div></section>;
}

function AnalyticsView({ overall, counts, total, subjects, subjectStats, studyHours }: any) { return <section className="analytics-page"><div className="page-heading"><div><h2>Analytics</h2><p>Detailed insights into your preparation.</p></div><button className="select-btn">This Week⌄</button></div><div className="analytics-stats"><Metric icon={<Clock3/>} label="Study Time" value={`${studyHours.reduce((a:number,b:number)=>a+b,0).toFixed(1)}h`}/><Metric icon={<Activity/>} label="Study Sessions" value="7"/><Metric icon={<Clock3/>} label="Daily Average" value={`${(studyHours.reduce((a:number,b:number)=>a+b,0)/7).toFixed(1)}h`}/><Metric icon={<Trophy/>} label="Goal Completion" value={`${overall}%`}/></div><div className="analytics-grid"><section className="panel chart-panel"><h3>Study Time Trend</h3><MiniLine data={studyHours} tall/></section><section className="panel donut-panel"><h3>Progress by Subject</h3><div className="donut-content"><ProgressRing value={overall}/><div>{subjects.map((s:SubjectName)=><div className="legend-subject" key={s}><i style={{background:subjectMeta[s].color}}/><span>{subjectMeta[s].short}</span><b>{subjectStats(s).percent}%</b></div>)}</div></div></section></div><section className="panel analytics-progress"><h3>Completion Overview</h3>{stages.map(s=><ProgressLine key={s.key} label={s.label} value={total ? Math.round(counts[s.key]/total*100):0}/>)}</section></section>; }

function ActivityView({ activities }: { activities: ActivityItem[] }) { return <section className="single-page"><div className="page-heading"><div><h2>Activity</h2><p>A history of your completed study milestones.</p></div></div><section className="panel activity-full">{activities.length ? activities.map(item=><RecentRow key={item.id} item={item}/>) : <div className="empty"><Activity size={28}/><h3>No activity yet</h3><p>Mark a chapter, revision, or test complete to see it here.</p></div>}</section></section>; }
function ComingSoon({ view, onDashboard }: any) { return <section className="coming-soon panel"><div className="coming-icon"><Plus size={24}/></div><h2>{view}</h2><p>This section is ready for the next build phase. The dashboard and chapter tracker are already functional.</p><button onClick={onDashboard}>Back to Dashboard</button></section>; }

function SubjectRow({ subject, stats, onClick }: any) { const meta=subjectMeta[subject]; return <button className="subject-row-new" onClick={onClick}><span className="subject-badge" style={{background:meta.color}}>{meta.code}</span><span className="subject-name">{meta.short}</span><span className="subject-bar"><i style={{width:`${stats.percent}%`}}/></span><b>{stats.percent}%</b><small>{stats.done}/{stats.total}</small><ChevronRight size={17}/></button>; }
function RecentRow({ item }: { item:any }) { const meta=subjectMeta[item.subject as SubjectName]; const s=stages.find(x=>x.key===item.stage)!; return <div className="recent-row"><span className="subject-badge" style={{background:meta?.color || "#5b6fd6"}}>{meta?.code || "CA"}</span><span className="recent-copy"><b>{item.chapter}</b><small>{stageCopy[item.stage as Stage]}</small></span><span className={`activity-status ${item.stage}`}>{s?.short}</span><time>{item.time}</time></div>; }
function Metric({ icon, label, value }: any) { return <div className="metric"><i>{icon}</i><span>{label}</span><b>{value}</b></div>; }
function ProgressLine({ label, value }: { label:string; value:number }) { return <div className="progress-line"><span>{label}</span><div><i style={{width:`${value}%`}}/></div><b>{value}%</b></div>; }
function ProgressRing({ value }: { value:number }) { return <div className="progress-ring" style={{background:`conic-gradient(#2d68cf ${value}%, #e9edf3 0)`}}><div><b>{value}%</b><span>Completed</span></div></div>; }
function MiniLine({ data, tall=false }: { data:number[]; tall?:boolean }) { const max=Math.max(...data,1); const points=data.map((v,i)=>`${i*(100/(data.length-1))},${100-(v/max)*75-5}`).join(" "); return <div className={`mini-line ${tall?"tall":""}`}><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d68cf" stopOpacity=".18"/><stop offset="100%" stopColor="#2d68cf" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#fill)"/><polyline points={points} fill="none" stroke="#2d68cf" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="days">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><span key={d}>{d}</span>)}</div></div>; }
