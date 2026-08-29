import { CSSProperties, ReactNode } from "react";
import { SectionProps, SettingField } from "./types";

export const contentFields: SettingField[] = [
  { key: "label", label: "Heading", type: "text", target: "content" },
  { key: "description", label: "Text", type: "textarea", target: "content" },
];
export const designFields: SettingField[] = [
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
export const baseAppearance = {
  backgroundColor: "#ffffff",
  textColor: "#17243a",
  borderColor: "#e2e8f0",
  padding: 24,
  borderRadius: 16,
  alignment: "left",
  maxWidth: 1200,
};
export function SectionFrame({
  item,
  className,
  children,
}: {
  item: SectionProps["item"];
  className: string;
  children?: ReactNode;
}) {
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
  return (
    <section className={`registry-section ${className}`} style={style}>
      {children}
    </section>
  );
}
export function TextContent({ item }: { item: SectionProps["item"] }) {
  const image = String(item.config?.imageUrl || ""),
    label = String(item.config?.buttonLabel || ""),
    route = String(item.config?.route || "");
  return (
    <>
      {image && <img src={image} alt="" />}
      <div>
        <h2>{item.label}</h2>
        {item.description && <p>{item.description}</p>}
        {label && route && <a href={route}>{label}</a>}
      </div>
    </>
  );
}
