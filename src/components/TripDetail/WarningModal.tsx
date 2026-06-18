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
      <div className="bg-surface-mint border border-gray-800 rounded-2xl p-8 max-w-md w-full space-y-6">
        <div>
          <p className="text-xl items-center text-brand-mid-dark font-bold mb-1 flex gap-2">
            <WarningIcon /> Antes de continuar
          </p>
          <p className="text-brand-mid-dark text-sm">
            El itinerario se generará sin considerar a los viajeros que faltan.
          </p>
        </div>
        <ul className="space-y-2 text-brand-mid">
          {warnings.map((w, i) => (
            <li key={i} className="text-sm flex gap-2">
              <span>•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-btn-bg hover:opacity-80 cursor-pointer text-white text-sm font-semibold transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-btn-bg-hover hover:opacity-80 cursor-pointer text-white text-sm font-semibold transition"
          >
            Generar de todas formas
          </button>
        </div>
      </div>
    </div>
  );
}
