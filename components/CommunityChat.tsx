"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Hash,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type CommunityMessage = {
  id: string;
  user_id: string;
  channel: string;
  message: string;
  created_at: string;
};

type Channel = {
  id: string;
  label: string;
  description: string;
};

const channels: Channel[] = [
  {
    id: "general",
    label: "General",
    description: "Talk about anything related to CA preparation.",
  },
  {
    id: "foundation",
    label: "CA Foundation",
    description: "Discussion for CA Foundation students.",
  },
  {
    id: "intermediate",
    label: "CA Intermediate",
    description: "Discuss CA Intermediate preparation.",
  },
  {
    id: "final",
    label: "CA Final",
    description: "Discussion for CA Final students.",
  },
  {
    id: "doubts",
    label: "Doubts & Discussion",
    description: "Ask questions and help other students.",
  },
  {
    id: "motivation",
    label: "Study Motivation",
    description: "Stay consistent and motivate each other.",
  },
];

function getDisplayName(email: string) {
  if (!email) return "Student";

  return email
    .split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value: string) {
  const date = new Date(value);
  const now = new Date();

  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

export default function CommunityChat({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [activeChannel, setActiveChannel] =
    useState("general");

  const [messages, setMessages] =
    useState<CommunityMessage[]>([]);

  const [draft, setDraft] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const activeChannelData = useMemo(
    () =>
      channels.find(
        (channel) =>
          channel.id === activeChannel
      ) || channels[0],
    [activeChannel]
  );

  const displayName =
    getDisplayName(email);

  const initial =
    displayName.charAt(0).toUpperCase() ||
    "S";

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
          .select(
            "id, user_id, channel, message, created_at"
          )
          .eq(
            "channel",
            activeChannel
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(100);

      if (!mounted) return;

      if (error) {
        console.error(
          "Unable to load community messages:",
          error.message
        );

        setError(
          "Unable to load messages. Please try again."
        );
      } else {
        setMessages(
          (data || []).reverse()
        );
      }

      setLoading(false);
    };

    loadMessages();

    const channel = supabase
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
          const message =
            payload.new as CommunityMessage;

          setMessages(
            (current) => {
              if (
                current.some(
                  (item) =>
                    item.id === message.id
                )
              ) {
                return current;
              }

              return [
                ...current,
                message,
              ];
            }
          );
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const text = draft.trim();

    if (
      !text ||
      sending ||
      !supabase
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
          channel: activeChannel,
          message: text,
        });

    if (error) {
      console.error(
        "Unable to send community message:",
        error.message
      );

      setError(
        "Message could not be sent. Please try again."
      );
    } else {
      setDraft("");
    }

    setSending(false);
  };

  return (
    <section className="community-page">
      <div className="community-layout">
        <aside className="community-channels">
          <div className="community-channels-head">
            <div className="community-icon">
              <MessageCircle size={19} />
            </div>

            <div>
              <h2>Community</h2>
              <p>Study together</p>
            </div>
          </div>

          <div className="community-channel-list">
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

                  <span>
                    {channel.label}
                  </span>
                </button>
              )
            )}
          </div>

          <div className="community-members">
            <Users size={16} />

            <span>
              CA Progress Community
            </span>
          </div>
        </aside>

        <div className="community-chat">
          <header className="community-chat-header">
            <div>
              <div className="community-title">
                <Hash size={20} />

                <h2>
                  {
                    activeChannelData.label
                  }
                </h2>
              </div>

              <p>
                {
                  activeChannelData.description
                }
              </p>
            </div>
          </header>

          <div className="community-messages">
            {loading ? (
              <div className="community-state">
                Loading messages...
              </div>
            ) : error &&
              messages.length === 0 ? (
              <div className="community-state error">
                {error}
              </div>
            ) : messages.length === 0 ? (
              <div className="community-empty">
                <div>
                  <MessageCircle
                    size={28}
                  />
                </div>

                <h3>
                  Start the conversation
                </h3>

                <p>
                  Be the first to send a
                  message in{" "}
                  {
                    activeChannelData.label
                  }.
                </p>
              </div>
            ) : (
              messages.map(
                (item) => {
                  const mine =
                    item.user_id ===
                    userId;

                  const messageInitial =
                    mine
                      ? initial
                      : "S";

                  return (
                    <article
                      className={
                        mine
                          ? "community-message mine"
                          : "community-message"
                      }
                      key={item.id}
                    >
                      <div className="community-message-avatar">
                        {
                          messageInitial
                        }
                      </div>

                      <div className="community-message-body">
                        <div className="community-message-meta">
                          <b>
                            {mine
                              ? "You"
                              : "CA Student"}
                          </b>

                          <time>
                            {formatTime(
                              item.created_at
                            )}
                          </time>
                        </div>

                        <p>
                          {item.message}
                        </p>
                      </div>
                    </article>
                  );
                }
              )
            )}

            <div
              ref={
                messagesEndRef
              }
            />
          </div>

          <form
            className="community-input"
            onSubmit={
              sendMessage
            }
          >
            <div>
              <input
                value={draft}
                onChange={(event) =>
                  setDraft(
                    event.target.value
                  )
                }
                placeholder={`Message #${activeChannelData.label}`}
                maxLength={2000}
                disabled={sending}
              />

              <button
                type="submit"
                disabled={
                  sending ||
                  !draft.trim()
                }
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>

            {error && (
              <span className="community-send-error">
                {error}
              </span>
            )}
          </form>
        </div>
      </div>

      <style>{`
        .community-page {
          height: calc(100vh - 120px);
          min-height: 620px;
          padding: 0 0 4px;
        }

        .community-layout {
          height: 100%;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          overflow: hidden;
          background: #fff;
          border: 1px solid #e7eaf0;
          border-radius: 18px;
        }

        .community-channels {
          display: flex;
          flex-direction: column;
          border-right: 1px solid #e9edf3;
          background: #fbfcfe;
          min-width: 0;
        }

        .community-channels-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 22px 18px;
          border-bottom: 1px solid #edf0f4;
        }

        .community-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #eef3ff;
          color: #2d68cf;
        }

        .community-channels h2 {
          margin: 0;
          font-size: 15px;
          color: #1d2738;
        }

        .community-channels p {
          margin: 3px 0 0;
          color: #9299a7;
          font-size: 11px;
        }

        .community-channel-list {
          padding: 12px 10px;
          display: grid;
          gap: 3px;
        }

        .community-channel {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 11px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #70798a;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
        }

        .community-channel:hover {
          background: #f1f4f8;
          color: #344052;
        }

        .community-channel.active {
          background: #eaf1ff;
          color: #2862c3;
          font-weight: 700;
        }

        .community-members {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 16px 18px;
          border-top: 1px solid #edf0f4;
          color: #9098a6;
          font-size: 11px;
        }

        .community-chat {
          min-width: 0;
          min-height: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          background: #fff;
        }

        .community-chat-header {
          padding: 20px 26px;
          border-bottom: 1px solid #edf0f4;
        }

        .community-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #202b3d;
        }

        .community-title h2 {
          margin: 0;
          font-size: 17px;
        }

        .community-chat-header p {
          margin: 5px 0 0;
          color: #8a93a1;
          font-size: 12px;
        }

        .community-messages {
          overflow-y: auto;
          padding: 22px 26px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          scroll-behavior: smooth;
        }

        .community-message {
          display: flex;
          gap: 11px;
          max-width: 760px;
        }

        .community-message-avatar {
          flex: 0 0 36px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #eef2f8;
          color: #536073;
          font-size: 12px;
          font-weight: 800;
        }

        .community-message.mine .community-message-avatar {
          background: #e8f0ff;
          color: #2862c3;
        }

        .community-message-body {
          min-width: 0;
        }

        .community-message-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .community-message-meta b {
          color: #30394a;
          font-size: 13px;
        }

        .community-message-meta time {
          color: #a0a7b2;
          font-size: 10px;
        }

        .community-message-body p {
          margin: 0;
          padding: 10px 13px;
          border-radius: 4px 12px 12px 12px;
          background: #f5f7fa;
          color: #3e4858;
          font-size: 13px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .community-message.mine .community-message-body p {
          background: #edf4ff;
          color: #244c8e;
        }

        .community-empty,
        .community-state {
          margin: auto;
          text-align: center;
          color: #8a93a1;
          font-size: 13px;
        }

        .community-empty > div {
          width: 58px;
          height: 58px;
          margin: 0 auto 15px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background: #f2f5f9;
          color: #7d8795;
        }

        .community-empty h3 {
          margin: 0;
          color: #3a4351;
          font-size: 16px;
        }

        .community-empty p {
          margin: 7px 0 0;
          font-size: 12px;
        }

        .community-state.error {
          color: #c34c4c;
        }

        .community-input {
          padding: 16px 22px 20px;
          border-top: 1px solid #edf0f4;
        }

        .community-input > div {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 7px 6px 14px;
          border: 1px solid #dfe4eb;
          border-radius: 12px;
          background: #fff;
        }

        .community-input > div:focus-within {
          border-color: #9bb7e9;
          box-shadow: 0 0 0 3px rgba(45, 104, 207, 0.07);
        }

        .community-input input {
          flex: 1;
          min-width: 0;
          height: 38px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #30394a;
          font-size: 13px;
        }

        .community-input button {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 9px;
          background: #2d68cf;
          color: #fff;
          cursor: pointer;
          transition: 0.2s;
        }

        .community-input button:hover:not(:disabled) {
          background: #225ab7;
        }

        .community-input button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .community-send-error {
          display: block;
          margin-top: 7px;
          color: #c34c4c;
          font-size: 11px;
        }

        @media (max-width: 760px) {
          .community-page {
            height: calc(100vh - 100px);
            min-height: 560px;
          }

          .community-layout {
            grid-template-columns: 1fr;
          }

          .community-channels {
            display: block;
            border-right: 0;
            border-bottom: 1px solid #e9edf3;
          }

          .community-channels-head,
          .community-members {
            display: none;
          }

          .community-channel-list {
            display: flex;
            overflow-x: auto;
            padding: 9px;
            gap: 5px;
          }

          .community-channel {
            width: auto;
            flex: 0 0 auto;
            padding: 8px 10px;
            white-space: nowrap;
          }

          .community-chat-header {
            padding: 16px 18px;
          }

          .community-messages {
            padding: 18px;
          }

          .community-input {
            padding: 12px 14px 14px;
          }
        }
      `}</style>
    </section>
  );
}
