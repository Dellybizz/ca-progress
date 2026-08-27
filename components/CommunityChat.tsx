"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Hash, MessageCircle, Send } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type CommunityMessage = {
  id: string;
  user_id: string;
  display_name: string | null;
  channel: string;
  message: string;
  created_at: string;
};

type Channel = {
  id: string;
  name: string;
  description: string;
};

const channels: Channel[] = [
  {
    id: "general",
    name: "General",
    description: "Discuss anything related to CA preparation.",
  },
  {
    id: "foundation",
    name: "CA Foundation",
    description: "Connect with CA Foundation students.",
  },
  {
    id: "intermediate",
    name: "CA Intermediate",
    description: "Discuss CA Intermediate preparation.",
  },
  {
    id: "final",
    name: "CA Final",
    description: "Connect with CA Final students.",
  },
  {
    id: "doubts",
    name: "Doubts",
    description: "Ask questions and help other students.",
  },
  {
    id: "motivation",
    name: "Motivation",
    description: "Stay motivated and consistent together.",
  },
];

function formatTime(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStudentName(email?: string | null) {
  const emailName = email?.split("@")[0] || "Student";

  return emailName
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

export default function CommunityChat({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}) {
  const [activeChannel, setActiveChannel] =
    useState("general");

  const [messages, setMessages] =
    useState<CommunityMessage[]>([]);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const bottomRef =
    useRef<HTMLDivElement | null>(null);

  const currentChannel =
    channels.find(
      (channel) =>
        channel.id === activeChannel
    ) || channels[0];

  const displayName = formatStudentName(email);

  useEffect(() => {
    if (!supabase) {
      setError(
        "Supabase is not configured."
      );
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("community_messages")
          .select("*")
          .eq(
            "channel",
            activeChannel
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          )
          .limit(100);

      if (!mounted) return;

      if (error) {
        console.error(error);
        setError(
          "Unable to load messages."
        );
      } else {
        setMessages(data || []);
      }

      setLoading(false);
    };

    loadMessages();

    const realtimeChannel =
      supabase
        .channel(
          `community-${activeChannel}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "community_messages",
            filter: `channel=eq.${activeChannel}`,
          },
          (payload) => {
            const newMessage =
              payload.new as CommunityMessage;

            setMessages(
              (current) => {
                if (
                  current.some(
                    (item) =>
                      item.id ===
                      newMessage.id
                  )
                ) {
                  return current;
                }

                return [
                  ...current,
                  newMessage,
                ];
              }
            );
          }
        )
        .subscribe();

    return () => {
      mounted = false;

      supabase.removeChannel(
        realtimeChannel
      );
    };
  }, [activeChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const trimmed =
      message.trim();

    if (
      !trimmed ||
      !supabase ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    const { error } =
      await supabase
        .from("community_messages")
        .insert({
          user_id: userId,
          display_name: displayName,
          channel: activeChannel,
          message: trimmed,
        });

    if (error) {
      console.error(error);

      setError(
        "Unable to send message."
      );
    } else {
      setMessage("");
    }

    setSending(false);
  };

  return (
    <div className="community">
      <aside className="community-sidebar">
        <div className="community-sidebar-header">
          <MessageCircle size={20} />

          <div>
            <h2>Community</h2>
            <p>Study together</p>
          </div>
        </div>

        <div className="community-channels">
          {channels.map(
            (channel) => (
              <button
                key={channel.id}
                type="button"
                className={
                  activeChannel ===
                  channel.id
                    ? "community-channel active"
                    : "community-channel"
                }
                onClick={() =>
                  setActiveChannel(
                    channel.id
                  )
                }
              >
                <Hash size={16} />

                {channel.name}
              </button>
            )
          )}
        </div>
      </aside>

      <main className="community-main">
        <header className="community-header">
          <div>
            <div className="community-title">
              <Hash size={20} />

              <h1>
                {currentChannel.name}
              </h1>
            </div>

            <p>
              {
                currentChannel.description
              }
            </p>
          </div>
        </header>

        <div className="community-messages">
          {loading && (
            <div className="community-status">
              Loading messages...
            </div>
          )}

          {!loading &&
            error &&
            messages.length === 0 && (
              <div className="community-status">
                {error}
              </div>
            )}

          {!loading &&
            !error &&
            messages.length === 0 && (
              <div className="community-empty">
                <MessageCircle size={34} />

                <h3>
                  Start the conversation
                </h3>

                <p>
                  Be the first person to
                  send a message here.
                </p>
              </div>
            )}

          {messages.map(
            (item) => {
              const isMine =
                item.user_id === userId;
              const studentName =
                item.display_name?.trim() ||
                (isMine ? displayName : "CA Student");

              return (
                <div
                  key={item.id}
                  className={
                    isMine
                      ? "community-message mine"
                      : "community-message"
                  }
                >
                  <div className="message-avatar">
                    {studentName
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="message-content">
                    <div className="message-meta">
                      <strong>
                        {studentName}

                        {isMine && (
                          <em>You</em>
                        )}
                      </strong>

                      <span>
                        {formatTime(
                          item.created_at
                        )}
                      </span>
                    </div>

                    <div className="message-bubble">
                      {item.message}
                    </div>
                  </div>
                </div>
              );
            }
          )}

          <div ref={bottomRef} />
        </div>

        <form
          className="community-input"
          onSubmit={sendMessage}
        >
          <input
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value
              )
            }
            placeholder={`Message #${currentChannel.name}`}
            maxLength={2000}
            disabled={sending}
          />

          <button
            type="submit"
            disabled={
              sending ||
              !message.trim()
            }
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>

        {error && messages.length > 0 && (
          <div className="community-error">
            {error}
          </div>
        )}
      </main>

      <style>{`
        .community {
          height: calc(100vh - 120px);
          min-height: 620px;
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr);
          overflow: hidden;
          border: 1px solid #e6e9ee;
          border-radius: 18px;
          background: #ffffff;
        }

        .community-sidebar {
          display: flex;
          flex-direction: column;
          border-right: 1px solid #edf0f4;
          background: #fafbfd;
        }

        .community-sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 22px 18px;
          border-bottom: 1px solid #edf0f4;
        }

        .community-sidebar-header h2 {
          margin: 0;
          font-size: 15px;
          color: #202938;
        }

        .community-sidebar-header p {
          margin: 3px 0 0;
          font-size: 11px;
          color: #9299a5;
        }

        .community-channels {
          padding: 12px 10px;
          display: grid;
          gap: 3px;
        }

        .community-channel {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 0;
          border-radius: 9px;
          padding: 10px 11px;
          background: transparent;
          color: #717a88;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
        }

        .community-channel:hover {
          background: #f0f3f7;
          color: #303947;
        }

        .community-channel.active {
          background: #edf3ff;
          color: #2c64c7;
          font-weight: 600;
        }

        .community-main {
          min-width: 0;
          min-height: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
        }

        .community-header {
          padding: 20px 26px;
          border-bottom: 1px solid #edf0f4;
        }

        .community-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #252f3d;
        }

        .community-title h1 {
          margin: 0;
          font-size: 17px;
        }

        .community-header p {
          margin: 5px 0 0;
          font-size: 12px;
          color: #8e96a3;
        }

        .community-messages {
          overflow-y: auto;
          padding: 24px 26px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .community-message {
          display: flex;
          gap: 10px;
          max-width: 720px;
        }

        .message-avatar {
          flex: 0 0 36px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #eef1f5;
          color: #697586;
          font-size: 13px;
          font-weight: 700;
        }

        .mine .message-avatar {
          background: #eaf1ff;
          color: #2d67ca;
        }

        .message-content {
          min-width: 0;
        }

        .message-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .message-meta strong {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #354050;
        }

        .message-meta em {
          padding: 2px 5px;
          border-radius: 999px;
          background: #eaf1ff;
          color: #2d67ca;
          font-size: 8px;
          font-style: normal;
          font-weight: 700;
          text-transform: uppercase;
        }

        .message-meta span {
          font-size: 10px;
          color: #a0a7b1;
        }

        .message-bubble {
          padding: 10px 13px;
          border-radius: 4px 12px 12px 12px;
          background: #f4f6f8;
          color: #404957;
          font-size: 13px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .mine .message-bubble {
          background: #edf4ff;
          color: #284e8d;
        }

        .community-status,
        .community-empty {
          margin: auto;
          text-align: center;
          color: #8b94a1;
          font-size: 13px;
        }

        .community-empty svg {
          margin-bottom: 12px;
          color: #9da6b2;
        }

        .community-empty h3 {
          margin: 0;
          font-size: 16px;
          color: #404957;
        }

        .community-empty p {
          margin: 7px 0 0;
          font-size: 12px;
        }

        .community-input {
          display: flex;
          gap: 9px;
          padding: 16px 20px;
          border-top: 1px solid #edf0f4;
        }

        .community-input input {
          flex: 1;
          min-width: 0;
          height: 44px;
          padding: 0 15px;
          border: 1px solid #dfe4ea;
          border-radius: 11px;
          outline: none;
          font-size: 13px;
        }

        .community-input input:focus {
          border-color: #8eafe5;
          box-shadow: 0 0 0 3px rgba(45, 103, 202, 0.08);
        }

        .community-input button {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 11px;
          background: #2d67ca;
          color: #ffffff;
          cursor: pointer;
        }

        .community-input button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .community-error {
          padding: 0 20px 12px;
          color: #c74646;
          font-size: 11px;
        }

        @media (max-width: 760px) {
          .community {
            height: calc(100dvh - 92px);
            min-height: 480px;
            grid-template-columns: 1fr;
            grid-template-rows: auto minmax(0, 1fr);
            border-radius: 14px;
          }

          .community-sidebar {
            border-right: 0;
            border-bottom: 1px solid #edf0f4;
          }

          .community-sidebar-header {
            display: none;
          }

          .community-channels {
            display: flex;
            overflow-x: auto;
            gap: 5px;
            padding: 9px 10px;
            scrollbar-width: none;
            overscroll-behavior-x: contain;
          }

          .community-channels::-webkit-scrollbar {
            display: none;
          }

          .community-channel {
            width: auto;
            flex: 0 0 auto;
            white-space: nowrap;
            min-height: 38px;
            padding: 8px 11px;
          }

          .community-header {
            padding: 13px 15px;
          }

          .community-title h1 {
            font-size: 16px;
          }

          .community-header p {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .community-messages {
            gap: 15px;
            padding: 16px 13px;
            overscroll-behavior: contain;
          }

          .community-message {
            max-width: 92%;
            gap: 8px;
          }

          .community-message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
          }

          .community-message.mine .message-meta {
            justify-content: flex-end;
          }

          .message-avatar {
            flex-basis: 32px;
            width: 32px;
            height: 32px;
            font-size: 12px;
          }

          .message-bubble {
            padding: 9px 11px;
            font-size: 12px;
          }

          .mine .message-bubble {
            border-radius: 12px 4px 12px 12px;
          }

          .community-input {
            padding: 10px 11px calc(10px + env(safe-area-inset-bottom));
            background: #fff;
          }

          .community-input input,
          .community-input button {
            height: 42px;
          }

          .community-input button {
            width: 42px;
          }
        }

        @media (max-width: 420px) {
          .community {
            height: calc(100dvh - 82px);
            border-left: 0;
            border-right: 0;
            border-radius: 0;
          }

          .community-header p {
            display: none;
          }

          .message-meta {
            gap: 5px;
          }

          .message-meta span {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}
