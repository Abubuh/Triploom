import WarningIcon from "../Icons/WarningIcon";

interface Props {
  isOpen: boolean;
  warnings: string[];
  onClose: () => void;
  onConfirm: () => void;
}

export function WarningModal({ isOpen, warnings, onClose, onConfirm }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full space-y-6">
        <div>
          <p className="text-xl font-bold mb-1 flex gap-2">
            <WarningIcon /> Antes de continuar
          </p>
          <p className="text-gray-400 text-sm">
            El itinerario se generará sin considerar a los viajeros que faltan.
          </p>
        </div>
        <ul className="space-y-2">
          {warnings.map((w, i) => (
            <li key={i} className="text-yellow-400 text-sm flex gap-2">
              <span>•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
          >
            Generar de todas formas
          </button>
        </div>
      </div>
    </div>
  );
}
