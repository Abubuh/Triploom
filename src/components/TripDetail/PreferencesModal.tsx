import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { MemberPreferences } from "../../types/trip.types";
import {
  FOOD_OPTIONS,
  ACTIVITY_OPTIONS,
  PACE_OPTIONS,
} from "../../constants/tripOptions.tsx";
import EditIcon from "../Icons/EditIcon";
import PinIcon from "../Icons/PinIcon";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  userId: string;
  userCurrency: string;
  currentPreferences: MemberPreferences | null;
  onSaved: (updated: MemberPreferences) => void;
}

export function PreferencesModal({
  isOpen,
  onClose,
  tripId,
  userId,
  userCurrency,
  currentPreferences,
  onSaved,
}: Props) {
  const [editForm, setEditForm] = useState({
    budget: currentPreferences?.budget ?? 0,
    foodPreferences: currentPreferences?.food_preferences ?? [],
    activityPreferences: currentPreferences?.activity_preferences ?? [],
    attractionsPreferences: currentPreferences?.attractions_preferences ?? [],
    travelPace: currentPreferences?.travel_pace ?? ("moderate" as const),
  });
  const [attractionInput, setAttractionInput] = useState("");

  useEffect(() => {
    if (isOpen && currentPreferences) {
      setEditForm({
        budget: currentPreferences.budget,
        foodPreferences: currentPreferences.food_preferences,
        activityPreferences: currentPreferences.activity_preferences,
        attractionsPreferences:
          currentPreferences.attractions_preferences ?? [],
        travelPace: currentPreferences.travel_pace,
      });
      setAttractionInput("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const { error } = await supabase
      .from("member_preferences")
      .update({
        budget: editForm.budget,
        food_preferences: editForm.foodPreferences,
        activity_preferences: editForm.activityPreferences,
        attractions_preferences: editForm.attractionsPreferences,
        travel_pace: editForm.travelPace,
      })
      .eq("trip_id", tripId)
      .eq("user_id", userId);

    if (!error) {
      onSaved({
        budget: editForm.budget,
        food_preferences: editForm.foodPreferences,
        activity_preferences: editForm.activityPreferences,
        attractions_preferences: editForm.attractionsPreferences,
        travel_pace: editForm.travelPace,
      });
    }
  };

  const addAttraction = () => {
    if (!attractionInput.trim()) return;
    setEditForm((prev) => ({
      ...prev,
      attractionsPreferences: [
        ...prev.attractionsPreferences,
        attractionInput.trim(),
      ],
    }));
    setAttractionInput("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-surface-card border border-border-base dark:border-[#4a6b57] rounded-2xl p-8 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-base flex items-center gap-2">
            <EditIcon /> Editar preferencias
          </h2>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text-base transition"
          >
            ✕
          </button>
        </div>

                <div>
          <label className="text-text-base font-semibold mb-2 block">
            Presupuesto ({userCurrency})
          </label>
          <input
            type="number"
            value={editForm.budget}
            onChange={(e) =>
              setEditForm({ ...editForm, budget: Number(e.target.value) })
            }
            className="input-base"
          />
        </div>

                <div>
          <label className="text-text-base font-semibold mb-2 block">
            Comida
          </label>
          <div className="flex flex-wrap gap-2">
            {FOOD_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setEditForm((prev) => ({
                    ...prev,
                    foodPreferences: prev.foodPreferences.includes(opt)
                      ? prev.foodPreferences.filter((v) => v !== opt)
                      : [...prev.foodPreferences, opt],
                  }))
                }
                className={`px-3 py-1 rounded-full text-sm transition ${
                  editForm.foodPreferences.includes(opt)
                    ? "bg-brand-dark text-brand-light"
                    : "bg-surface-subtle text-text-muted hover:border-brand-mid hover:text-brand-mid border border-border-base"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

                <div>
          <label className="text-text-base font-semibold mb-2 block">
            Actividades
          </label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setEditForm((prev) => ({
                    ...prev,
                    activityPreferences: prev.activityPreferences.includes(opt)
                      ? prev.activityPreferences.filter((v) => v !== opt)
                      : [...prev.activityPreferences, opt],
                  }))
                }
                className={`px-3 py-1 rounded-full text-sm transition ${
                  editForm.activityPreferences.includes(opt)
                    ? "bg-brand-dark text-brand-light"
                    : "bg-surface-subtle text-text-muted hover:border-brand-mid hover:text-brand-mid border border-border-base"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

                <div>
          <label className="text-text-base font-semibold mb-2 block">
            Lugares de interés
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={attractionInput}
              onChange={(e) => setAttractionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && attractionInput.trim())
                  addAttraction();
              }}
              placeholder="Ej: Chichén Itzá"
              className="flex-1 input-base"
            />
            <button
              onClick={addAttraction}
              disabled={!attractionInput.trim()}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              ✓ Agregar
            </button>
          </div>
          {editForm.attractionsPreferences.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {editForm.attractionsPreferences.map((a, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 bg-surface-subtle text-text-muted text-sm px-3 py-1 rounded-full border border-border-base"
                >
                  <PinIcon /> {a}
                  <button
                    onClick={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        attractionsPreferences:
                          prev.attractionsPreferences.filter(
                            (_, idx) => idx !== i,
                          ),
                      }))
                    }
                    className="text-text-faint hover:text-red-400 transition ml-1"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

                <div>
          <label className="text-text-base font-semibold mb-2 block">
            Ritmo de viaje
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PACE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  setEditForm({
                    ...editForm,
                    travelPace: opt.value as "relaxed" | "moderate" | "intense",
                  })
                }
                className={`p-3 rounded-xl border-2 text-left transition ${
                  editForm.travelPace === opt.value
                    ? "border-brand-mid bg-brand-subtle"
                    : "border-border-base hover:border-brand-mid"
                }`}
              >
                <p>{opt.icon}</p>
                <p className="font-semibold text-sm text-text-base">
                  {opt.label}
                </p>
                <p className="text-text-faint text-xs">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

                <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-outline px-5 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="btn-primary px-5 py-2 text-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
