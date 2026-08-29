"use client";

import { CSSProperties } from "react";
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

export type SectionDefinition = {
  type: string;
  name: string;
  description: string;
  defaults: Pick<
    AppPageElement,
    "label" | "description" | "config" | "appearance"
  >;
  fields: SettingField[];
};

const contentFields: SettingField[] = [
  { key: "label", label: "Heading", type: "text", target: "content" },
  { key: "description", label: "Text", type: "textarea", target: "content" },
];

const designFields: SettingField[] = [
  {
    key: "backgroundColor",
    label: "Background",
    type: "color",
    target: "appearance",
  },
  {
    key: "textColor",
    label: "Text colour",
    type: "color",
    target: "appearance",
  },
  {
    key: "borderColor",
    label: "Border colour",
    type: "color",
    target: "appearance",
  },
  {
    key: "padding",
    label: "Spacing",
    type: "range",
    target: "appearance",
    min: 0,
    max: 80,
  },
  {
    key: "borderRadius",
    label: "Corner radius",
    type: "range",
    target: "appearance",
    min: 0,
    max: 40,
  },
  {
    key: "maxWidth",
    label: "Content width",
    type: "range",
    target: "appearance",
    min: 320,
    max: 1400,
    step: 20,
  },
  {
    key: "alignment",
    label: "Alignment",
    type: "select",
    target: "appearance",
    options: [
      { label: "Left", value: "left" },
      { label: "Centre", value: "center" },
      { label: "Right", value: "right" },
    ],
  },
];

const baseAppearance = {
  backgroundColor: "#ffffff",
  textColor: "#17243a",
  borderColor: "#e2e8f0",
  padding: 24,
  borderRadius: 16,
  alignment: "left",
  maxWidth: 1200,
};

export const sectionRegistry: Record<string, SectionDefinition> = {
  "native-reference": {
    type: "native-reference",
    name: "Built-in section",
    description: "Settings for an existing interactive application section.",
    defaults: {
      label: "Built-in section",
      description: "",
      config: {},
      appearance: baseAppearance,
    },
    fields: [
      ...contentFields,
      ...designFields.filter((field) =>
        ["backgroundColor", "textColor", "borderRadius"].includes(field.key),
      ),
    ],
  },
  native: {
    type: "native",
    name: "App content",
    description: "The page's built-in interactive content.",
    defaults: {
      label: "App content",
      description: "",
      config: { variant: "native" },
      appearance: { ...baseAppearance, padding: 0 },
    },
    fields: [],
  },
  "rich-text": {
    type: "rich-text",
    name: "Rich text",
    description: "A heading and supporting copy.",
    defaults: {
      label: "Talk about this page",
      description: "Add useful information for your students.",
      config: { variant: "rich-text" },
      appearance: baseAppearance,
    },
    fields: [...contentFields, ...designFields],
  },
  banner: {
    type: "banner",
    name: "Announcement banner",
    description: "A highlighted update or promotion.",
    defaults: {
      label: "Important update",
      description: "Share an announcement with students.",
      config: {
        variant: "banner",
        buttonLabel: "Learn more",
        route: "/pricing",
      },
      appearance: {
        ...baseAppearance,
        backgroundColor: "#eef4ff",
        borderColor: "#cfe0ff",
      },
    },
    fields: [
      ...contentFields,
      {
        key: "buttonLabel",
        label: "Button label",
        type: "text",
        target: "content",
      },
      { key: "route", label: "Button link", type: "url", target: "content" },
      ...designFields,
    ],
  },
  hero: {
    type: "hero",
    name: "Hero",
    description: "Large introduction with image and action.",
    defaults: {
      label: "Prepare with clarity",
      description: "Track every step of your CA preparation.",
      config: {
        variant: "hero",
        buttonLabel: "Get started",
        route: "/subjects",
        imageUrl: "",
      },
      appearance: { ...baseAppearance, padding: 40, borderRadius: 22 },
    },
    fields: [
      ...contentFields,
      { key: "imageUrl", label: "Image URL", type: "url", target: "content" },
      {
        key: "buttonLabel",
        label: "Button label",
        type: "text",
        target: "content",
      },
      { key: "route", label: "Button link", type: "url", target: "content" },
      ...designFields,
    ],
  },
  card: {
    type: "card",
    name: "Feature card",
    description: "A compact linked feature card.",
    defaults: {
      label: "Feature",
      description: "Describe this feature.",
      config: { variant: "card", buttonLabel: "Open", route: "/dashboard" },
      appearance: baseAppearance,
    },
    fields: [
      ...contentFields,
      {
        key: "buttonLabel",
        label: "Link label",
        type: "text",
        target: "content",
      },
      { key: "route", label: "Link", type: "url", target: "content" },
      ...designFields,
    ],
  },
  spacer: {
    type: "spacer",
    name: "Spacer",
    description: "Controlled vertical whitespace.",
    defaults: {
      label: "Spacer",
      description: "",
      config: { variant: "spacer", height: 32 },
      appearance: {},
    },
    fields: [
      {
        key: "height",
        label: "Height",
        type: "range",
        target: "content",
        min: 8,
        max: 160,
      },
    ],
  },
};

export const definitionFor = (item: AppPageElement) => {
  const explicitType = String(item.config?.variant || "");
  if (explicitType)
    return sectionRegistry[explicitType] || sectionRegistry["rich-text"];
  return item.element_key === "native-content"
    ? sectionRegistry.native
    : sectionRegistry["native-reference"];
};

export function BuilderSection({
  item,
  preview = false,
}: {
  item: AppPageElement;
  preview?: boolean;
}) {
  const type = definitionFor(item).type;
  if (type === "native" || type === "native-reference") {
    return preview ? (
      <div className="registry-native">
        <b>{type === "native" ? "App content" : item.label}</b>
        <span>
          {type === "native"
            ? "The interactive page renders here"
            : "Live built-in section"}
        </span>
      </div>
    ) : null;
  }
  if (type === "spacer")
    return (
      <div aria-hidden style={{ height: Number(item.config?.height || 32) }} />
    );
  const style: CSSProperties = {
    background: String(item.appearance?.backgroundColor || "#fff"),
    color: String(item.appearance?.textColor || "#17243a"),
    borderColor: String(item.appearance?.borderColor || "#e2e8f0"),
    borderRadius: Number(item.appearance?.borderRadius ?? 16),
    padding: Number(item.appearance?.padding ?? 24),
    textAlign:
      (item.appearance?.alignment as CSSProperties["textAlign"]) || "left",
    maxWidth: Number(item.appearance?.maxWidth || 1200),
    marginInline: "auto",
    width: "100%",
  };
  const imageUrl = String(item.config?.imageUrl || "");
  const buttonLabel = String(item.config?.buttonLabel || "");
  const route = String(item.config?.route || "");
  return (
    <section className={`registry-section registry-${type}`} style={style}>
      {imageUrl && <img src={imageUrl} alt="" />}
      <div>
        <h2>{item.label}</h2>
        {item.description && <p>{item.description}</p>}
        {buttonLabel && route && (
          <a href={preview ? undefined : route}>{buttonLabel}</a>
        )}
      </div>
    </section>
  );
}
