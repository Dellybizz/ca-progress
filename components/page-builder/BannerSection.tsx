import { SectionDefinition, SectionProps } from "./types";
import {
  baseAppearance,
  contentFields,
  designFields,
  SectionFrame,
  TextContent,
} from "./shared";
function BannerSection({ item }: SectionProps) {
  return (
    <SectionFrame item={item} className="registry-banner">
      <TextContent item={item} />
    </SectionFrame>
  );
}
export const bannerDefinition: SectionDefinition = {
  type: "banner",
  name: "Announcement banner",
  description: "A highlighted update or promotion.",
  defaults: {
    label: "Important update",
    description: "Share an announcement with students.",
    config: { variant: "banner", buttonLabel: "Learn more", route: "/pricing" },
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
  Component: BannerSection,
};
