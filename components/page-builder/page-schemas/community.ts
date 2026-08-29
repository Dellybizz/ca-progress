import { NativePageSection } from "./types";
export const communitySections: NativePageSection[] = [
  {
    pageKey: "community",
    key: "community-navigation",
    label: "Channels",
    description: "Community channel navigation",
    selector: ".chat-sidebar",
    parentKey: "native-content",
  },
  {
    pageKey: "community",
    key: "community-header",
    label: "Chat header",
    description: "Selected channel information",
    selector: ".chat-header",
    parentKey: "native-content",
  },
  {
    pageKey: "community",
    key: "community-pinned",
    label: "Pinned announcement",
    description: "Pinned channel announcement",
    selector: ".chat-pinned",
    parentKey: "native-content",
  },
  {
    pageKey: "community",
    key: "community-messages",
    label: "Messages",
    description: "Live conversation",
    selector: ".chat-messages",
    parentKey: "native-content",
  },
  {
    pageKey: "community",
    key: "community-composer",
    label: "Message composer",
    description: "Chat input and send action",
    selector: ".chat-composer",
    parentKey: "native-content",
  },
];
