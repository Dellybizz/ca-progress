import { SectionDefinition, SectionProps } from "./types";
import {
  baseAppearance,
  contentFields,
  designFields,
  SectionFrame,
  TextContent,
} from "./shared";
function CardSection({ item }: SectionProps) {
  return (
    <SectionFrame item={item} className="registry-card">
      <TextContent item={item} />
    </SectionFrame>
  );
}
export const cardDefinition: SectionDefinition = {
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
  Component: CardSection,
};
