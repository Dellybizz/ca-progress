"use client";

import { AppPageElement } from "@/context/ProgressContext";
import { SectionDefinition, SettingField } from "./sections/types";
import {
  nativeDefinition,
  nativePresetDefinitions,
  nativeReferenceDefinition,
} from "./sections/NativeSection";
import { richTextDefinition } from "./sections/RichTextSection";
import { bannerDefinition } from "./sections/BannerSection";
import { heroDefinition } from "./sections/HeroSection";
import { cardDefinition } from "./sections/CardSection";
import { spacerDefinition } from "./sections/SpacerSection";

export type { SectionDefinition, SettingField };

const definitions = [
  nativeDefinition,
  nativeReferenceDefinition,
  richTextDefinition,
  bannerDefinition,
  heroDefinition,
  cardDefinition,
  spacerDefinition,
];
export const sectionRegistry = Object.fromEntries(
  definitions.map((definition) => [definition.type, definition]),
) as Record<string, SectionDefinition>;

export const definitionFor = (item: AppPageElement) => {
  const explicit = String(item.config?.variant || "");
  if (explicit)
    return sectionRegistry[explicit] || sectionRegistry["rich-text"];
  if (item.element_key === "native-content") return sectionRegistry.native;
  const preset = String(item.config?.editorPreset || "");
  return nativePresetDefinitions[preset] || sectionRegistry["native-reference"];
};

export function BuilderSection({
  item,
  preview = false,
}: {
  item: AppPageElement;
  preview?: boolean;
}) {
  const Component = definitionFor(item).Component;
  return <Component item={item} preview={preview} />;
}
