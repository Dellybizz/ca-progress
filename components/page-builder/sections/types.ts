import { ComponentType } from "react";
import { AppPageElement } from "@/context/ProgressContext";

export type SettingField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "color" | "range" | "url" | "number";
  target: "content" | "appearance";
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
};
export type SectionProps = { item: AppPageElement; preview?: boolean };
export type SectionDefinition = {
  type: string;
  name: string;
  description: string;
  defaults: Pick<
    AppPageElement,
    "label" | "description" | "config" | "appearance"
  >;
  fields: SettingField[];
  Component: ComponentType<SectionProps>;
};
