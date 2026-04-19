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

export function EditTripModal({ isOpen, onClose, trip, destinations, onSaved }: Props) {
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
        }))
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
      { city: newDest.city.trim(), country: newDest.country.trim(), days: newDest.days, order_index: prev.length },
    ]);
    setNewDest({ city: "", country: "", days: 1 });
  }

  function handleRemoveDest(index: number) {
    setDests((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, order_index: i })));
  }

  async function handleSave() {
    if (!name.trim()) { setError("El nombre del viaje es requerido."); return; }
    if (!startDate || !endDate) { setError("Las fechas son requeridas."); return; }
    if (dests.length === 0) { setError("Agrega al menos un destino."); return; }

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
          }))
        )
        .select();

      if (insertError || !newDestData) {
        setError("Error al guardar destinos. Intenta de nuevo.");
        return;
      }

      onSaved(
        { ...trip, name: name.trim(), start_date: startDate, end_date: endDate },
        newDestData as Destination[]
      );
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Editar viaje</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-sm text-gray-400">Nombre del viaje</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ej: Vacaciones en Europa"
          />
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Fecha de inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Fecha de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Destinos */}
        <div className="space-y-3">
          <label className="text-sm text-gray-400">Destinos</label>

          {/* Lista actual */}
          {dests.length > 0 && (
            <div className="space-y-2">
              {dests.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-blue-400 font-semibold">#{i + 1}</span>
                    <span className="text-white">
                      {d.city}, {d.country}
                    </span>
                    <span className="text-gray-400">{d.days} día{d.days !== 1 ? "s" : ""}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveDest(i)}
                    className="text-gray-500 hover:text-red-400 transition text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Agregar destino */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newDest.city}
                onChange={(e) => setNewDest({ ...newDest, city: e.target.value })}
                placeholder="Ciudad"
                className={inputClass}
                onKeyDown={(e) => e.key === "Enter" && handleAddDest()}
              />
              <input
                type="text"
                value={newDest.country}
                onChange={(e) => setNewDest({ ...newDest, country: e.target.value })}
                placeholder="País"
                className={inputClass}
                onKeyDown={(e) => e.key === "Enter" && handleAddDest()}
              />
              <input
                type="number"
                min={1}
                value={newDest.days}
                onChange={(e) => setNewDest({ ...newDest, days: Math.max(1, Number(e.target.value)) })}
                placeholder="Días"
                className={inputClass}
              />
            </div>
            <button
              onClick={handleAddDest}
              disabled={!newDest.city.trim() || !newDest.country.trim()}
              className="w-full border border-dashed border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400 rounded-xl py-2.5 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Agregar destino
            </button>
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Acciones */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 text-sm transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
