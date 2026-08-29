import { SectionDefinition, SectionProps } from "./types";
import {
  baseAppearance,
  contentFields,
  designFields,
  SectionFrame,
  TextContent,
} from "./shared";
function RichTextSection({ item }: SectionProps) {
  return (
    <SectionFrame item={item} className="registry-rich-text">
      <TextContent item={item} />
    </SectionFrame>
  );
}
export const richTextDefinition: SectionDefinition = {
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
  Component: RichTextSection,
};
