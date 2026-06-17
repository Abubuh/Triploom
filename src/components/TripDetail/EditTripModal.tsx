import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Trip, Destination } from "../../types/trip.types";

interface DestForm {
  city: string;
  country: string;
  days: number;
  order_index: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  destinations: Destination[];
  onSaved: (updatedTrip: Trip, updatedDestinations: Destination[]) => void;
}

export function EditTripModal({
  isOpen,
  onClose,
  trip,
  destinations,
  onSaved,
}: Props) {
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [dests, setDests] = useState<DestForm[]>([]);
  const [newDest, setNewDest] = useState({ city: "", country: "", days: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(trip.name);
      setStartDate(trip.start_date);
      setEndDate(trip.end_date);
      setDests(
        destinations.map(({ city, country, days, order_index }) => ({
          city,
          country,
          days,
          order_index,
        })),
      );
      setNewDest({ city: "", country: "", days: 1 });
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleAddDest() {
    if (!newDest.city.trim() || !newDest.country.trim()) return;
    setDests((prev) => [
      ...prev,
      {
        city: newDest.city.trim(),
        country: newDest.country.trim(),
        days: newDest.days,
        order_index: prev.length,
      },
    ]);
    setNewDest({ city: "", country: "", days: 1 });
  }

  function handleRemoveDest(index: number) {
    setDests((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((d, i) => ({ ...d, order_index: i })),
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("El nombre del viaje es requerido.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Las fechas son requeridas.");
      return;
    }
    if (dests.length === 0) {
      setError("Agrega al menos un destino.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: tripError } = await supabase
        .from("trips")
        .update({ name: name.trim(), start_date: startDate, end_date: endDate })
        .eq("id", trip.id);
      if (tripError) {
        setError("Error al guardar el viaje. Intenta de nuevo.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("destinations")
        .delete()
        .eq("trip_id", trip.id);
      if (deleteError) {
        setError("Error al actualizar destinos. Intenta de nuevo.");
        return;
      }

      const { data: newDestData, error: insertError } = await supabase
        .from("destinations")
        .insert(
          dests.map((d, i) => ({
            city: d.city,
            country: d.country,
            days: d.days,
            order_index: i,
            trip_id: trip.id,
          })),
        )
        .select();

      if (insertError || !newDestData) {
        setError("Error al guardar destinos. Intenta de nuevo.");
        return;
      }

      onSaved(
        {
          ...trip,
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
        },
        newDestData as Destination[],
      );
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-surface-card border border-border-base dark:border-[#4a6b57] rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-base">Editar viaje</h2>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text-base transition text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="modal-subtitle">Nombre del viaje</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
            placeholder="Ej: Vacaciones en Europa"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="modal-subtitle">Fecha de inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-base"
            />
          </div>
          <div className="space-y-1.5">
            <label className="modal-subtitle">Fecha de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-base"
            />
          </div>
        </div>
        <div className="space-y-3">
          <label className="modal-subtitle">Destinos</label>

          {dests.length > 0 && (
            <div className="space-y-2">
              {dests.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-surface-subtle border border-border-base dark:border-[#4a6b57] rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 text-sm ">
                    <span className="font-semibold dark:text-brand-subtle">
                      #{i + 1}
                    </span>
                    <span className="text-text-base dark:text-brand-subtle">
                      {d.city}, {d.country}
                    </span>
                    <span className="text-text-faint dark:text-brand-subtle">
                      {d.days} día{d.days !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveDest(i)}
                    className="text-text-faint hover:text-red-400 transition text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newDest.city}
                onChange={(e) =>
                  setNewDest({ ...newDest, city: e.target.value })
                }
                placeholder="Ciudad"
                className="input-base"
                onKeyDown={(e) => e.key === "Enter" && handleAddDest()}
              />
              <input
                type="text"
                value={newDest.country}
                onChange={(e) =>
                  setNewDest({ ...newDest, country: e.target.value })
                }
                placeholder="País"
                className="input-base"
                onKeyDown={(e) => e.key === "Enter" && handleAddDest()}
              />
              <input
                type="number"
                min={1}
                value={newDest.days}
                onChange={(e) =>
                  setNewDest({
                    ...newDest,
                    days: Math.max(1, Number(e.target.value)),
                  })
                }
                placeholder="Días"
                className="input-base"
              />
            </div>
            <button
              onClick={handleAddDest}
              disabled={!newDest.city.trim() || !newDest.country.trim()}
              className="w-full border border-dashed border-border-base hover:border-brand-mid text-text-faint hover:text-brand-mid rounded-xl py-2.5 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Agregar destino
            </button>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-outline px-5 py-2.5 text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
