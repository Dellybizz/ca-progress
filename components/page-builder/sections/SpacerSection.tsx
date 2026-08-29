import { SectionDefinition, SectionProps } from "./types";
function SpacerSection({ item }: SectionProps) {
  return (
    <div aria-hidden style={{ height: Number(item.config?.height || 32) }} />
  );
}
export const spacerDefinition: SectionDefinition = {
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
  Component: SpacerSection,
};
