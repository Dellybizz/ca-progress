import { SectionDefinition, SectionProps } from "./types";
import {
  baseAppearance,
  contentFields,
  designFields,
  SectionFrame,
  TextContent,
} from "./shared";
function HeroSection({ item }: SectionProps) {
  return (
    <SectionFrame item={item} className="registry-hero">
      <TextContent item={item} />
    </SectionFrame>
  );
}
export const heroDefinition: SectionDefinition = {
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
  Component: HeroSection,
};
