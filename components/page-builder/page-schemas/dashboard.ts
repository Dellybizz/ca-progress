import { NativePageSection } from "./types";
export const dashboardSections: NativePageSection[] = [
  {
    pageKey: "dashboard",
    key: "exam-countdown",
    label: "Exam countdown",
    description: "Attempt countdown card",
    selector: ".exam-card",
  },
  {
    pageKey: "dashboard",
    key: "daily-streak",
    label: "Daily streak",
    description: "Current study streak",
    selector: ".streak-card",
  },
  {
    pageKey: "dashboard",
    key: "overall-progress",
    label: "Overall progress",
    description: "Overall completion card",
    selector: ".overall-card",
  },
  {
    pageKey: "dashboard",
    key: "activity-progress",
    label: "Progress by activity",
    description: "Activity stage progress",
    selector: ".activity-progress",
  },
  {
    pageKey: "dashboard",
    key: "study-week",
    label: "Study this week",
    description: "Weekly study chart",
    selector: ".study-card",
  },
  {
    pageKey: "dashboard",
    key: "subject-progress",
    label: "Subject progress",
    description: "Subject progress list",
    selector: ".subject-panel",
  },
  {
    pageKey: "dashboard",
    key: "recent-activity",
    label: "Recent activity",
    description: "Latest progress changes",
    selector: ".recent-panel",
  },
  {
    pageKey: "dashboard",
    key: "quick-actions",
    label: "Quick actions",
    description: "Dashboard shortcuts",
    selector: ".quick-panel",
  },
];
