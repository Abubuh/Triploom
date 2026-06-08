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
  const time = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-brand-subtle text-brand-mid dark:bg-brand-dark/40 dark:text-brand-light">
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
    return () => {
      cancelled = true;
    };
  }, [isOpen, tripId]);

  useLayoutEffect(() => {
    const behavior = scrollBehaviorRef.current;
    scrollBehaviorRef.current = "none";
    if (behavior === "restore") {
      const container = messagesContainerRef.current;
      if (container)
        container.scrollTop =
          container.scrollHeight - prevScrollHeightRef.current;
    } else if (behavior === "bottom") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
          if ((payload.new as { user_id: string }).user_id === currentUserId)
            return;
          const { data } = await supabase
            .from("trip_messages")
            .select("*, profiles(name, email)")
            .eq("id", (payload.new as { id: string }).id)
            .single();
          if (data) {
            scrollBehaviorRef.current = "bottom";
            setMessages((prev) => [...prev, data as Message]);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
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
        prev.map((m) => (m.id === tempId ? (data as Message) : m)),
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

  // Skeleton reutilizable
  const SkeletonMsg = ({ reverse = false }: { reverse?: boolean }) => (
    <div
      className={`flex gap-2 animate-pulse ${reverse ? "flex-row-reverse" : ""}`}
    >
      <div className="w-8 h-8 rounded-full shrink-0 bg-border-base" />
      <div className="space-y-1.5 flex-1">
        <div className="h-2.5 rounded w-20 bg-border-base" />
        <div className="h-8 rounded-2xl w-3/4 bg-border-base" />
      </div>
    </div>
  );

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed z-40 flex flex-col
          bg-surface-card border-border-base dark:border-[#4a6b57]
          transition-transform duration-300 ease-in-out
          bottom-0 left-0 right-0 h-[60vh] rounded-t-2xl border-t
          md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:w-96 md:rounded-none md:border-t-0 md:border-l
          ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-base dark:border-[#4a6b57] shrink-0">
          <div>
            <p className="font-semibold dark:text-brand-subtle text-text-base">
              Chat del grupo
            </p>
            <p className="text-text-faint text-sm">{tripName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text-base transition text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Mensajes */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
          {loadingMore && (
            <div className="space-y-4 mb-2">
              {[1, 2, 3].map((i) => (
                <SkeletonMsg key={i} />
              ))}
            </div>
          )}

          {!hasMore && messages.length > 0 && !loading && (
            <p className="text-center py-2 text-text-faint">Inicio del chat</p>
          )}

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonMsg key={i} reverse={i % 2 === 0} />
              ))}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <p className="text-center text-sm mt-8 text-text-faint">
              Nadie ha escrito aún. ¡Sé el primero!
            </p>
          )}

          {!loading &&
            messages.map((msg) => {
              const isOwn = msg.user_id === currentUserId;
              const name =
                msg.profiles?.name ?? msg.profiles?.email ?? "Usuario";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  {!isOwn && <Avatar name={name} />}
                  <div
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[80%]`}
                  >
                    {!isOwn && (
                      <span className="text-xs mb-1 font-medium text-text-muted dark:text-brand-subtle">
                        {name}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                        isOwn
                          ? "bg-brand-dark text-brand-subtle "
                          : "bg-surface-subtle text-text-base dark:text-brand-light"
                      }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-xs mt-1 text-text-faint">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border-base dark:border-[#4a6b57] shrink-0">
          {sendError && (
            <p className="text-xs mb-2 text-red-400">{sendError}</p>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              rows={1}
              disabled={sending || loading}
              className="flex-1 input-base resize-none disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim() || loading}
              className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
