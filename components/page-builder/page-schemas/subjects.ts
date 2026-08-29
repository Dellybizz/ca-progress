import { NativePageSection } from "./types";
export const subjectsSections: NativePageSection[] = [
  {
    pageKey: "subjects",
    key: "subjects-heading",
    label: "Page heading",
    description: "Subjects title and search",
    selector: ".page-heading",
    parentKey: "native-content",
  },
  {
    pageKey: "subjects",
    key: "subjects-list",
    label: "Subject list",
    description: "Available course subjects",
    selector: ".subject-list-full",
    parentKey: "native-content",
  },
];
