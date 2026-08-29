import { SectionDefinition, SectionProps } from "./types";
import { baseAppearance, contentFields, designFields } from "./shared";
function NativeSection({ item, preview }: SectionProps) {
  return preview ? (
    <div className="registry-native">
      <b>
        {item.element_key === "native-content" ? "App content" : item.label}
      </b>
      <span>Live built-in section</span>
    </div>
  ) : null;
}
export const nativeDefinition: SectionDefinition = {
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
  Component: NativeSection,
};
export const nativeReferenceDefinition: SectionDefinition = {
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
  Component: NativeSection,
};
