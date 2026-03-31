import { useRef, useState } from "react";
import { Trip, DocumentCategory } from "../types/trip.types";
import { useDocuments } from "../hooks/useDocuments";

const CATEGORIES: { value: DocumentCategory; label: string; emoji: string }[] =
  [
    { value: "vuelo", label: "Vuelo", emoji: "✈️" },
    { value: "hotel", label: "Hotel", emoji: "🏨" },
    { value: "transporte", label: "Transporte", emoji: "🚌" },
    { value: "seguro", label: "Seguro", emoji: "🛡️" },
    { value: "visa", label: "Visa", emoji: "🪪" },
    { value: "otro", label: "Otro", emoji: "📄" },
  ];

type TabType = "file" | "link";

interface Props {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentDrawer({ trip, isOpen, onClose }: Props) {
  const { documents, loading, addLink, uploadFile, deleteDocument } =
    useDocuments(trip.id);

  const [tab, setTab] = useState<TabType>("file");
  const [category, setCategory] = useState<DocumentCategory>("otro");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryInfo = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat) ?? { emoji: "📄", label: cat };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadFile(file, trip.id, category);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddLink = async () => {
    if (!linkName || !linkUrl) return;
    setSubmitting(true);
    await addLink({
      trip_id: trip.id,
      name: linkName,
      type: "link",
      url: linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`,
      category,
    });
    setLinkName("");
    setLinkUrl("");
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold">📄 Documentos</h2>
            <p className="text-gray-400 text-sm">{trip.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-xl"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <div className="px-6 py-4 border-b border-gray-800 shrink-0 space-y-3">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab("file")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                tab === "file"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              📎 Subir archivo
            </button>
            <button
              onClick={() => setTab("link")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                tab === "link"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              🔗 Agregar link
            </button>
          </div>

          {/* Categorías */}
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`text-xs px-2 py-1 rounded-full transition ${
                  category === cat.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* Tab: Subir archivo */}
          {tab === "file" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-xl p-6 text-center cursor-pointer transition"
            >
              <p className="text-gray-400 text-sm">
                {uploading ? "⏳ Subiendo..." : "Click para seleccionar un PDF"}
              </p>
              <p className="text-gray-600 text-xs mt-1">PDF hasta 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Tab: Agregar link */}
          {tab === "link" && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nombre (ej. Reserva Hotel Osaka)"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="URL (ej. booking.com/...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddLink}
                disabled={submitting || !linkName || !linkUrl}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition"
              >
                {submitting ? "..." : "Agregar link"}
              </button>
            </div>
          )}
        </div>

        {/* Lista de documentos */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            <p className="text-gray-500 text-sm">Cargando documentos...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-8">
              Sin documentos agregados aún
            </p>
          ) : (
            documents.map((doc) => {
              const cat = categoryInfo(doc.category);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 group"
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-gray-400 text-xs">{cat.label}</p>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs shrink-0"
                  >
                    {doc.type === "file" ? "Ver PDF" : "Abrir →"}
                  </a>
                  <button
                    onClick={() => deleteDocument(doc.id, doc.url, doc.type)}
                    className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 ml-1"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
