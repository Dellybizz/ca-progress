"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BookOpen,
  Hash,
  MessageCircle,
  Send,
  Trophy,
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
  display_name: string | null;
  channel: string;
  message: string;
  created_at: string;
};

const mainChannels = [
  ["general", "General", "Discuss anything related to CA preparation."],
  ["doubts", "Doubts", "Ask questions and help other students."],
  ["announcements", "Announcements", "Important community updates."],
  ["resources", "Resources", "Share useful notes and study resources."],
  ["results", "Result Talk", "Discuss exams, results and preparation."],
] as const;

const studyRooms = [
  ["audit", "Audit", "Study Audit together."],
  ["taxation", "Taxation", "Discuss taxation concepts and questions."],
  ["accounting", "Accounting", "Practice accounting concepts together."],
  ["law", "Law", "Discuss important law concepts and cases."],
  ["costing", "Costing", "Solve costing questions with other students."],
  ["fm-sm", "FM & SM", "Discuss Financial Management and Strategic Management."],
] as const;

const channels = [...mainChannels, ...studyRooms] as const;

function studentName(email?: string | null) {
  const value = email?.split("@")[0] || "Student";

  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function messageTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CommunityChat({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}) {
  const [activeChannel, setActiveChannel] = useState("general");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const displayName = useMemo(() => studentName(email), [email]);

  const currentChannel =
    channels.find(([id]) => id === activeChannel) || channels[0];

  const participants = useMemo(() => {
    const names = messages
      .map((item) =>
        item.display_name?.trim() ||
        (item.user_id === userId ? displayName : "CA Student")
      )
      .filter((name, index, all) => all.indexOf(name) === index);

    if (!names.includes(displayName)) names.unshift(displayName);
    return names.slice(0, 7);
  }, [displayName, messages, userId]);

  useEffect(() => {
    if (!supabase) {
      setError("Community is not configured.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    const loadMessages = async () => {
      const { data, error: loadError } = await supabase
        .from("community_messages")
        .select("id,user_id,display_name,channel,message,created_at")
        .eq("channel", activeChannel)
        .order("created_at", { ascending: true })
        .limit(150);

      if (!active) return;

      if (loadError) {
        console.error(loadError);
        setError("Unable to load messages.");
      } else {
        setMessages(data || []);
      }

      setLoading(false);
    };

    void loadMessages();

    const realtime = supabase
      .channel(`community-${activeChannel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: `channel=eq.${activeChannel}`,
        },
        (payload) => {
          const incoming = payload.new as CommunityMessage;
          setMessages((current) =>
            current.some((item) => item.id === incoming.id)
              ? current
              : [...current, incoming]
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(realtime);
    };
  }, [activeChannel]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!supabase) return;

    const backfillName = async () => {
      const { error: updateError } = await supabase
        .from("community_messages")
        .update({ display_name: displayName })
        .eq("user_id", userId)
        .is("display_name", null);

      if (!updateError) {
        setMessages((current) =>
          current.map((item) =>
            item.user_id === userId && !item.display_name
              ? { ...item, display_name: displayName }
              : item
          )
        );
      }
    };

    void backfillName();
  }, [displayName, userId]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();

    if (!message || !supabase || sending) return;

    setSending(true);
    setError("");

    const { data, error: sendError } = await supabase
      .from("community_messages")
      .insert({
        user_id: userId,
        display_name: displayName,
        channel: activeChannel,
        message,
      })
      .select("id,user_id,display_name,channel,message,created_at")
      .single();

    if (sendError) {
      console.error(sendError);
      setError("Unable to send message. Please try again.");
    } else {
      setDraft("");
      setMessages((current) =>
        current.some((item) => item.id === data.id)
          ? current
          : [...current, data]
      );
    }

    setSending(false);
  };

  return (
    <section className="chat-shell">
      <aside className="chat-sidebar">
        <div className="chat-brand">
          <MessageCircle size={20} />
          <div>
            <strong>Community</strong>
            <span>Study together</span>
          </div>
        </div>

        <nav className="chat-channels" aria-label="Community channels">
          <span className="channel-group-title">Channels</span>
          {mainChannels.map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={id === activeChannel ? "active" : ""}
              onClick={() => setActiveChannel(id)}
            >
              <Hash size={16} />
              <span>{label}</span>
            </button>
          ))}

          <span className="channel-group-title study-title">Study rooms</span>
          {studyRooms.map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={id === activeChannel ? "active" : ""}
              onClick={() => setActiveChannel(id)}
            >
              <Users size={15} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="chat-panel">
        <header className="chat-header">
          <div className="chat-heading">
            <Hash size={20} />
            <strong>{currentChannel[1]}</strong>
          </div>
          <p>{currentChannel[2]}</p>
        </header>

        <div className="chat-messages" ref={messagesRef}>
          {activeChannel === "general" && !loading && (
            <div className="chat-pinned">
              <span className="pinned-icon"><BookOpen size={16} /></span>
              <div>
                <small>Community guide</small>
                <strong>Welcome to the CA study community</strong>
                <p>Ask questions, exchange preparation tips and help fellow students.</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="chat-state">Loading messages…</div>
          ) : error && messages.length === 0 ? (
            <div className="chat-state">{error}</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <MessageCircle size={32} />
              <strong>Start the conversation</strong>
              <span>Be the first student to send a message.</span>
            </div>
          ) : (
            messages.map((item) => {
              const mine = item.user_id === userId;
              const name =
                item.display_name?.trim() ||
                (mine ? displayName : "CA Student");

              return (
                <article
                  key={item.id}
                  className={`chat-message${mine ? " mine" : ""}`}
                >
                  <div className="chat-avatar">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="chat-message-body">
                    <div className="chat-meta">
                      <strong>{name}</strong>
                      {mine && <small>You</small>}
                      <time>{messageTime(item.created_at)}</time>
                    </div>
                    <p>{item.message}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <form className="chat-composer" onSubmit={sendMessage}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message #${currentChannel[1]}`}
            aria-label="Message"
            maxLength={2000}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>

        {error && messages.length > 0 && (
          <div className="chat-error">{error}</div>
        )}
      </div>

      <aside className="chat-insights">
        <section>
          <div className="insight-heading">
            <span><Users size={15} /> Active students</span>
            <b>{participants.length}</b>
          </div>

          <div className="student-list">
            {participants.map((name, index) => (
              <div className="student-item" key={name}>
                <span className={`student-avatar shade-${index % 4}`}>
                  {name.charAt(0).toUpperCase()}
                  <i />
                </span>
                <div>
                  <strong>{name}</strong>
                  <small>{name === displayName ? "You" : "Studying now"}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="community-focus">
          <div className="insight-heading">
            <span><Trophy size={15} /> Community focus</span>
          </div>
          <div className="focus-card">
            <strong>Stay consistent</strong>
            <p>Share one useful insight from today&apos;s study session.</p>
            <div><i /><span>Daily community goal</span></div>
          </div>
        </section>
      </aside>

      <style>{`
        .chat-shell{width:100%;max-width:100%;min-width:0;min-height:0;height:100%;display:grid;grid-template-columns:220px minmax(0,1fr) 220px;overflow:hidden;border:1px solid #e4e9f1;border-radius:16px;background:#fff;box-shadow:0 10px 35px rgba(35,54,88,.05)}
        .chat-sidebar{min-width:0;overflow:hidden;border-right:1px solid #e9edf3;background:#f9fbfe}.chat-brand{height:88px;padding:20px;display:flex;align-items:center;gap:11px;border-bottom:1px solid #e9edf3;color:#26364c}.chat-brand div{display:grid;gap:3px}.chat-brand strong{font-size:14px}.chat-brand span{font-size:10px;color:#8a96a8}
        .chat-channels{min-height:0;overflow-y:auto;padding:12px 10px;display:grid;align-content:start;gap:3px}.channel-group-title{padding:4px 10px 6px;color:#99a3b2;font-size:8px;font-weight:800;letter-spacing:.8px;text-transform:uppercase}.channel-group-title.study-title{margin-top:10px}.chat-channels button{width:100%;min-width:0;height:39px;padding:0 10px;display:flex;align-items:center;gap:8px;border:0;border-radius:9px;background:transparent;color:#6f7d91;text-align:left;font-size:11px}.chat-channels button:hover{background:#eef3f9}.chat-channels button.active{background:#eaf1ff;color:#2863c7;font-weight:700}.chat-channels button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .chat-panel{min-width:0;min-height:0;overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr) auto}.chat-header{padding:18px 24px;border-bottom:1px solid #e9edf3}.chat-heading{display:flex;align-items:center;gap:8px;color:#243247}.chat-heading strong{font-size:16px}.chat-header p{margin:5px 0 0;font-size:11px;color:#8490a1}
        .chat-messages{min-width:0;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;padding:18px 20px;display:flex;flex-direction:column;gap:16px}.chat-state,.chat-empty{margin:auto;text-align:center;color:#8b96a6}.chat-empty{display:grid;justify-items:center;gap:8px}.chat-empty strong{color:#3e4b5e}.chat-empty span,.chat-state{font-size:12px}.chat-pinned{display:flex;gap:11px;padding:12px;border:1px solid #dfe7f4;border-radius:11px;background:#fbfdff}.pinned-icon{width:32px;height:32px;flex:0 0 32px;display:grid;place-items:center;border-radius:8px;background:#eaf1ff;color:#2863c7}.chat-pinned div{min-width:0;display:grid;gap:2px}.chat-pinned small{color:#7f8b9d;font-size:8px}.chat-pinned strong{color:#2f3b4e;font-size:11px}.chat-pinned p{margin:0;color:#7a8698;font-size:9px;line-height:1.45}
        .chat-message{width:min(720px,88%);display:flex;align-items:flex-start;gap:9px}.chat-avatar{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:50%;background:#eef1f5;color:#667386;font-size:12px;font-weight:800}.chat-message-body{min-width:0}.chat-meta{min-height:19px;display:flex;align-items:center;gap:6px;margin-bottom:4px}.chat-meta strong{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#344155;font-size:11px}.chat-meta small{padding:2px 5px;border-radius:999px;background:#eaf1ff;color:#2863c7;font-size:7px;font-weight:800;text-transform:uppercase}.chat-meta time{color:#9aa4b2;font-size:9px}.chat-message p{margin:0;padding:9px 12px;border-radius:4px 12px 12px 12px;background:#f3f5f8;color:#3f4b5c;font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.chat-message.mine{align-self:flex-end;flex-direction:row-reverse}.chat-message.mine .chat-meta{justify-content:flex-end}.chat-message.mine .chat-avatar{background:#e9f1ff;color:#2863c7}.chat-message.mine p{border-radius:12px 4px 12px 12px;background:#eaf2ff;color:#234d8e}
        .chat-composer{width:100%;min-width:0;padding:12px 15px calc(12px + env(safe-area-inset-bottom));display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:9px;border-top:1px solid #e9edf3;background:#fff}.chat-composer input{width:100%;min-width:0;height:44px;padding:0 14px;border:1px solid #dce3ec;border-radius:11px;outline:0;font-size:13px}.chat-composer input:focus{border-color:#82a8e4;box-shadow:0 0 0 3px rgba(45,103,202,.08)}.chat-composer button{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:11px;background:#2d67ca;color:#fff}.chat-composer button:disabled{opacity:.4}.chat-error{padding:0 16px 9px;color:#bd4141;font-size:10px}
        .chat-insights{min-width:0;overflow-y:auto;border-left:1px solid #e9edf3;background:#fbfcfe;padding:18px 14px}.chat-insights section+section{margin-top:24px}.insight-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;color:#354156;font-size:10px;font-weight:800}.insight-heading span{display:flex;align-items:center;gap:6px}.insight-heading b{padding:3px 6px;border-radius:999px;background:#eaf1ff;color:#2863c7;font-size:8px}.student-list{display:grid;gap:11px}.student-item{display:flex;align-items:center;gap:8px}.student-avatar{position:relative;width:29px;height:29px;flex:0 0 29px;display:grid;place-items:center;border-radius:50%;background:#eaf1ff;color:#2863c7;font-size:10px;font-weight:800}.student-avatar.shade-1{background:#f2eafe;color:#7455b8}.student-avatar.shade-2{background:#e7f7ef;color:#32805d}.student-avatar.shade-3{background:#fff0e5;color:#b56728}.student-avatar i{position:absolute;right:0;bottom:0;width:7px;height:7px;border:1.5px solid #fff;border-radius:50%;background:#35a66f}.student-item div{min-width:0;display:grid;gap:2px}.student-item strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#3c4758;font-size:9px}.student-item small{color:#929baa;font-size:7px}.focus-card{padding:12px;border:1px solid #e2e8f1;border-radius:11px;background:#fff}.focus-card strong{font-size:10px}.focus-card p{margin:5px 0 11px;color:#7e8999;font-size:8px;line-height:1.5}.focus-card div{display:flex;align-items:center;gap:6px;color:#6d798b;font-size:7px}.focus-card i{width:7px;height:7px;border-radius:50%;background:#35a66f}
        @media(max-width:1180px){.chat-shell{grid-template-columns:210px minmax(0,1fr)}.chat-insights{display:none}}
        @media(max-width:760px){.chat-shell{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);border-radius:12px}.chat-sidebar{width:100%;border-right:0;border-bottom:1px solid #e9edf3}.chat-brand,.channel-group-title{display:none}.chat-channels{width:100%;max-width:100vw;padding:8px;display:flex;gap:4px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none}.chat-channels::-webkit-scrollbar{display:none}.chat-channels button{width:auto;height:38px;flex:0 0 auto;padding:0 10px;white-space:nowrap}.chat-panel{max-width:100%;min-height:0}.chat-header{padding:12px 14px}.chat-heading strong{font-size:15px}.chat-header p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chat-messages{padding:13px 11px;gap:14px}.chat-pinned{padding:10px}.chat-message{width:min(92%,520px)}.chat-avatar{width:31px;height:31px;flex-basis:31px}.chat-meta strong{max-width:140px}.chat-message p{padding:8px 10px;font-size:12px}.chat-composer{padding:9px 9px calc(9px + env(safe-area-inset-bottom));grid-template-columns:minmax(0,1fr) 42px;gap:7px}.chat-composer input,.chat-composer button{height:42px}.chat-composer button{width:42px}}
        @media(max-width:420px){.chat-shell{border-left:0;border-right:0;border-bottom:0;border-radius:0}.chat-header p{display:none}.chat-messages{padding:13px 9px}.chat-message{width:95%;gap:7px}.chat-meta{gap:4px}.chat-meta strong{max-width:120px}.chat-meta time{font-size:8px}.chat-composer{grid-template-columns:minmax(0,1fr) 40px;padding-left:8px;padding-right:8px}.chat-composer button{width:40px}}
      `}</style>
    </section>
  );
}
