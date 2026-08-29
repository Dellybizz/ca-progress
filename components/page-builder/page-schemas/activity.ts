import { NativePageSection } from "./types";
export const activitySections: NativePageSection[] = [
  {
    pageKey: "activity",
    key: "activity-heading",
    label: "Page heading",
    description: "Activity title",
    selector: ".page-heading",
    parentKey: "native-content",
  },
  {
    pageKey: "activity",
    key: "activity-history",
    label: "Activity history",
    description: "Saved progress history",
    selector: ".activity-full",
    parentKey: "native-content",
  },
];
