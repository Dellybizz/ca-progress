import { NativePageSection } from "./types";
export const chaptersSections: NativePageSection[] = [
  {
    pageKey: "chapters",
    key: "chapters-heading",
    label: "Chapter heading",
    description: "Subject title and progress",
    selector: ".chapter-top",
    parentKey: "native-content",
  },
  {
    pageKey: "chapters",
    key: "chapters-toolbar",
    label: "Chapter toolbar",
    description: "Subject selector, search and save",
    selector: ".chapter-toolbar",
    parentKey: "native-content",
  },
  {
    pageKey: "chapters",
    key: "chapters-table",
    label: "Chapter table",
    description: "Completion, revision and test tracker",
    selector: ".chapter-table",
    parentKey: "native-content",
  },
];
