import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 20;

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: { name: string; email: string } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  currentUserId: string;
  currentUserName: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) return time;
  if (msgDay.getTime() === yesterday.getTime()) return `ayer a las ${time}`;
  return `${date.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" })} ${time}`;
}

function Avatar({ name }: { name: string }) {
  const initial = (name ?? "?")[0].toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: "#1e1e3a", color: "#9090b0" }}
    >
      {initial}
    </div>
  );
}

export function GroupChatPanel({
  isOpen,
  onClose,
  tripId,
  tripName,
  currentUserId,
  currentUserName,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(PAGE_SIZE);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const scrollBehaviorRef = useRef<"bottom" | "restore" | "none">("none");

  // Initial load when panel opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      setMessages([]);
      const { data } = await supabase
        .from("trip_messages")
        .select("*, profiles(name, email)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (cancelled) return;
      const list = (data ?? []) as Message[];
      scrollBehaviorRef.current = "bottom";
      setMessages(list.reverse());
      setHasMore(list.length === PAGE_SIZE);
      setOffset(PAGE_SIZE);
      setLoading(false);
    }

    loadInitial();
    return () => { cancelled = true; };
  }, [isOpen, tripId]);

  // Unified scroll handler — runs before paint so there's no flicker
  useLayoutEffect(() => {
    const behavior = scrollBehaviorRef.current;
    scrollBehaviorRef.current = "none";
    if (behavior === "restore") {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
      }
    } else if (behavior === "bottom") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel(`group_chat_${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_messages",
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          // Own messages are already inserted optimistically
          if ((payload.new as { user_id: string }).user_id === currentUserId) return;
          const { data } = await supabase
            .from("trip_messages")
            .select("*, profiles(name, email)")
            .eq("id", (payload.new as { id: string }).id)
            .single();
          if (data) {
            scrollBehaviorRef.current = "bottom";
            setMessages((prev) => [...prev, data as Message]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, tripId, currentUserId]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    setLoadingMore(true);
    prevScrollHeightRef.current = container.scrollHeight;
    scrollBehaviorRef.current = "restore";

    const { data } = await supabase
      .from("trip_messages")
      .select("*, profiles(name, email)")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const list = (data ?? []) as Message[];
    setMessages((prev) => [...list.reverse(), ...prev]);
    setOffset((o) => o + PAGE_SIZE);
    setHasMore(list.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  function handleScroll() {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;
    if (container.scrollTop < 60) loadMore();
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInput("");
    setSendError(null);
    setSending(true);

    const tempId = crypto.randomUUID();
    const tempMsg: Message = {
      id: tempId,
      user_id: currentUserId,
      message: trimmed,
      created_at: new Date().toISOString(),
      profiles: { name: currentUserName, email: "" },
    };
    scrollBehaviorRef.current = "bottom";
    setMessages((prev) => [...prev, tempMsg]);

    const { data, error } = await supabase
      .from("trip_messages")
      .insert({ trip_id: tripId, user_id: currentUserId, message: trimmed })
      .select("*, profiles(name, email)")
      .single();

    if (error) {
      console.error("Error al enviar mensaje:", error);
      setSendError("No se pudo enviar el mensaje.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (data as Message) : m))
      );
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Overlay — mobile only */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed z-40 flex flex-col
          transition-transform duration-300 ease-in-out
          bottom-0 left-0 right-0 h-[60vh] rounded-t-2xl border-t
          md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:w-96 md:rounded-none md:border-t-0 md:border-l
          ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"}
        `}
        style={{ background: "#0d0d1a", borderColor: "#1e1e3a" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid #1e1e3a" }}
        >
          <div>
            <p className="font-semibold text-sm text-white">Chat del grupo</p>
            <p className="text-xs" style={{ color: "#9090b0" }}>{tripName}</p>
          </div>
          <button
            onClick={onClose}
            className="transition text-lg leading-none px-1"
            style={{ color: "#9090b0" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9090b0")}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
          {/* Skeleton while loading more */}
          {loadingMore && (
            <div className="space-y-4 mb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-8 h-8 rounded-full shrink-0" style={{ background: "#1e1e3a" }} />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2.5 rounded w-20" style={{ background: "#1e1e3a" }} />
                    <div className="h-8 rounded-2xl w-3/4" style={{ background: "#1e1e3a" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No more messages indicator */}
          {!hasMore && messages.length > 0 && !loading && (
            <p className="text-center text-xs py-2" style={{ color: "#4a4a6a" }}>
              Inicio del chat
            </p>
          )}

          {/* Initial loading skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`flex gap-2 animate-pulse ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                  <div className="w-8 h-8 rounded-full shrink-0" style={{ background: "#1e1e3a" }} />
                  <div className="space-y-1.5 max-w-[75%]">
                    <div className="h-2.5 rounded w-20" style={{ background: "#1e1e3a" }} />
                    <div className="h-10 rounded-2xl w-48" style={{ background: "#1e1e3a" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && messages.length === 0 && (
            <p className="text-center text-sm mt-8" style={{ color: "#4a4a6a" }}>
              Nadie ha escrito aún. ¡Sé el primero!
            </p>
          )}

          {/* Messages */}
          {!loading &&
            messages.map((msg) => {
              const isOwn = msg.user_id === currentUserId;
              const name = msg.profiles?.name ?? msg.profiles?.email ?? "Usuario";

              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                  {!isOwn && <Avatar name={name} />}
                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[80%]`}>
                    {!isOwn && (
                      <span className="text-xs mb-1 font-medium" style={{ color: "#9090b0" }}>
                        {name}
                      </span>
                    )}
                    <div
                      className="rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words"
                      style={
                        isOwn
                          ? { background: "#2563eb", color: "#ffffff" }
                          : { background: "#111121", color: "#e0e0f0" }
                      }
                    >
                      {msg.message}
                    </div>
                    <span className="text-xs mt-1" style={{ color: "#4a4a6a" }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid #1e1e3a" }}
        >
          {sendError && (
            <p className="text-xs mb-2" style={{ color: "#f87171" }}>{sendError}</p>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              rows={1}
              disabled={sending || loading}
              className="flex-1 text-white text-sm rounded-xl px-4 py-2 outline-none resize-none placeholder-gray-600 disabled:opacity-50"
              style={{
                background: "#111121",
                border: "1px solid #2a2a44",
                maxHeight: "120px",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3b5bdb")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a44")}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim() || loading}
              className="text-white px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 disabled:opacity-40"
              style={{ background: "#2563eb" }}
              onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2563eb"; }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
