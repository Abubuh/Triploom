import { useEffect, useRef, useState } from "react";
import { GeneratedItinerary, Trip } from "../../types/trip.types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itinerary: GeneratedItinerary | null;
  trip: Trip;
  onItineraryUpdate: (updated: GeneratedItinerary) => Promise<void>;
}

const ITINERARY_UPDATE_RE = /<itinerary_update>([\s\S]*?)<\/itinerary_update>/;

const extractItineraryUpdate = (text: string): GeneratedItinerary | null => {
  const match = text.match(ITINERARY_UPDATE_RE);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as GeneratedItinerary;
  } catch {
    return null;
  }
};

const displayContent = (text: string): string =>
  text.replace(ITINERARY_UPDATE_RE, "").trim();

export function ChatPanel({
  isOpen,
  onClose,
  itinerary,
  trip,
  onItineraryUpdate,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingItinerary, setUpdatingItinerary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const buildSystemParts = () => {
    const itineraryJson = itinerary
      ? JSON.stringify(itinerary, null, 2)
      : "Aún no hay itinerario generado.";
    console.log(
      "Itinerary tokens aprox:",
      Math.round(itineraryJson.length / 4),
    ); // ← agrega esto
    console.log(
      "Itinerary tokens aprox:",
      Math.round(itineraryJson.length / 4),
    );

    return {
      instructions: `Eres un agente de viajes conciso y amigable.
Tu único rol es ayudar al usuario con su itinerario y los destinos de su viaje.
Respondes de forma breve y directa, sin listas innecesarias ni emojis excesivos.
Puedes responder preguntas sobre lugares, restaurantes, transporte y actividades relacionadas con los destinos del viaje.
Si el usuario pregunta algo completamente ajeno al viaje (clima de otro país, noticias, etc), redirígelo: "Solo puedo ayudarte con tu viaje. ¿Tienes alguna pregunta sobre tu itinerario o destinos?"

Si el usuario pide un CAMBIO al itinerario, responde con una explicación breve y el itinerario completo modificado dentro de tags:
<itinerary_update>{ ...JSON completo... }</itinerary_update>
Cuando agregues o modifiques actividades, conserva SIEMPRE todas las actividades existentes. Solo reorganiza horarios si es necesario para acomodar la nueva actividad. Cuando el usuario diga "X tiempo después de Y actividad", suma ese tiempo exactamente al horario de inicio de Y. No estimes duración de actividades.
Si no hay cambios, NUNCA incluyas JSON.
Responde siempre en el idioma del usuario.`,
      itineraryText: `ITINERARIO ACTUAL DEL VIAJE "${trip.name}":\n${itineraryJson}`,
    };
  };
  const callApi = async (
    conversationMessages: ChatMessage[],
  ): Promise<string> => {
    const { instructions, itineraryText } = buildSystemParts();
    const lastAssistantIdx = conversationMessages.reduce(
      (last, msg, i) => (msg.role === "assistant" ? i : last),
      -1,
    );
    const apiMessages = conversationMessages.map((msg, i) =>
      i === lastAssistantIdx
        ? {
            role: msg.role,
            content: [
              {
                type: "text",
                text: msg.content,
                cache_control: { type: "ephemeral" },
              },
            ],
          }
        : msg,
    );

    const response = import.meta.env.DEV
      ? await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "prompt-caching-2024-07-31",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 4000,
            system: [
              { type: "text", text: instructions },
              {
                type: "text",
                text: itineraryText,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: apiMessages,
          }),
        })
      : await fetch("/api/chat-itinerary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instructions,
            itineraryText,
            messages: apiMessages,
          }),
        });

    const data = await response.json();
    console.log("Token usage:", data.usage);
    console.log("Full response:", JSON.stringify(data.usage));
    return data.content[0].text as string;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setSending(true);

    try {
      const responseText = await callApi(updatedMessages);

      const parsed = extractItineraryUpdate(responseText);
      const assistantContent = displayContent(responseText);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent },
      ]);

      if (parsed) {
        setUpdatingItinerary(true);
        try {
          await onItineraryUpdate(parsed);
        } finally {
          setUpdatingItinerary(false);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Overlay — mobile only */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed z-40 bg-gray-900 border-gray-800 flex flex-col
          transition-transform duration-300 ease-in-out
          bottom-0 left-0 right-0 h-[60vh] rounded-t-2xl border-t
          md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:w-96 md:rounded-none md:border-t-0 md:border-l
          ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <div>
            <p className="font-semibold text-sm">Agente de viajes</p>
            <p className="text-gray-500 text-xs">{trip.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-500 text-sm text-center mt-8">
              Pregúntame sobre el itinerario o pídeme que lo modifique.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-4 py-2 text-sm text-gray-400">
                <span className="animate-pulse">Pensando...</span>
              </div>
            </div>
          )}

          {updatingItinerary && (
            <div className="flex justify-center">
              <span className="text-blue-400 text-xs font-semibold animate-pulse bg-blue-500/10 px-3 py-1 rounded-full">
                Actualizando itinerario...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-800 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              rows={1}
              disabled={sending}
              className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-4 py-2 outline-none border border-gray-700 focus:border-blue-500 resize-none disabled:opacity-50 placeholder-gray-500"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
