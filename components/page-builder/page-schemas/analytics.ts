import { NativePageSection } from "./types";
export const analyticsSections: NativePageSection[] = [
  {
    pageKey: "analytics",
    key: "analytics-heading",
    label: "Page heading",
    description: "Analytics title and period",
    selector: ".page-heading",
    parentKey: "native-content",
  },
  {
    pageKey: "analytics",
    key: "analytics-metrics",
    label: "Summary metrics",
    description: "Study summary cards",
    selector: ".analytics-stats",
    parentKey: "native-content",
  },
  {
    pageKey: "analytics",
    key: "analytics-charts",
    label: "Analytics charts",
    description: "Progress visualisations",
    selector: ".analytics-grid",
    parentKey: "native-content",
  },
];
