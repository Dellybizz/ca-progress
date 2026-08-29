import { NativePageSection } from "./types";
const workspace = (pageKey: string, label: string): NativePageSection[] => [
  {
    pageKey,
    key: `${pageKey}-heading`,
    label: `${label} heading`,
    description: "Page title and save action",
    selector: ".workspace-heading",
    parentKey: "native-content",
  },
  {
    pageKey,
    key: `${pageKey}-form`,
    label: `${label} form`,
    description: "Create a new item",
    selector: ".workspace-form",
    parentKey: "native-content",
  },
  {
    pageKey,
    key: `${pageKey}-content`,
    label: `${label} content`,
    description: "Saved items",
    selector: pageKey === "notes" ? ".notes-grid" : ".workspace-list",
    parentKey: "native-content",
  },
];
export const workspaceSections = [
  ...workspace("study-sessions", "Study sessions"),
  ...workspace("goals", "Goals"),
  ...workspace("test-series", "Test series"),
  ...workspace("calendar", "Calendar"),
  ...workspace("notes", "Notes"),
];
