import { NativePageSection } from "./types";
export const settingsSections: NativePageSection[] = [
  "course-settings",
  "settings-account",
  "settings-membership",
  "settings-data",
  "settings-admin-link",
].map((key, index) => ({
  pageKey: "settings",
  key: `settings-${index}`,
  label: key
    .split("-")
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(" "),
  description: "Settings panel",
  selector: `.${key}`,
  parentKey: "native-content",
}));
