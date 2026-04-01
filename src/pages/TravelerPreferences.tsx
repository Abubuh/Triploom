import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  FOOD_OPTIONS,
  ACTIVITY_OPTIONS,
  PACE_OPTIONS,
} from "../constants/tripOptions.tsx";
import PlaneIcon from "../components/Icons/PlaneIcon";

const STEPS = ["Presupuesto", "Preferencias"];

function TravelerPreferences() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [attractions, setAttractions] = useState<string[]>([]);
  const [attractionInput, setAttractionInput] = useState("");
  const [budget, setBudget] = useState<number>(0);
  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  const [activityPreferences, setActivityPreferences] = useState<string[]>([]);
  const [travelPace, setTravelPace] = useState<
    "relaxed" | "moderate" | "intense"
  >("moderate");

  const toggleOption = (field: "food" | "activity", value: string) => {
    if (field === "food") {
      setFoodPreferences((prev) =>
        prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value],
      );
    } else {
      setActivityPreferences((prev) =>
        prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value],
      );
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("member_preferences").insert({
      trip_id: tripId,
      user_id: user.id,
      budget,
      food_preferences: foodPreferences,
      activity_preferences: activityPreferences,
      attractions_preferences: attractions,
      travel_pace: travelPace,
    });

    setLoading(false);
    navigate(`/trips/${tripId}`);
  };

  const handleAddAttraction = () => {
    if (!attractionInput.trim()) return;
    setAttractions((prev) => [...prev, attractionInput.trim()]);
    setAttractionInput("");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-3xl mx-auto border-b border-gray-800">
        <h1 className="text-2xl font-bold">
          Triploom <PlaneIcon />
        </h1>
      </nav>

      <main className="max-w-3xl mx-auto px-8 py-12">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-12">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                  i < step
                    ? "bg-blue-600 text-white"
                    : i === step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm hidden md:block ${i === step ? "text-white" : "text-gray-500"}`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px ${i < step ? "bg-blue-600" : "bg-gray-800"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Presupuesto */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                ¿Cuál es tu presupuesto?
              </h2>
              <p className="text-gray-400">
                Tu presupuesto personal para este viaje en MXN
              </p>
            </div>
            <input
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 15000"
            />
          </div>
        )}

        {/* Step 2 — Preferencias */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tu estilo de viaje</h2>
              <p className="text-gray-400">
                Esto ayuda a personalizar el itinerario para todos
              </p>
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">
                ¿Qué tipo de comida te gusta?
              </label>
              <div className="flex flex-wrap gap-2">
                {FOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleOption("food", opt)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      foodPreferences.includes(opt)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">
                ¿Qué actividades te interesan?
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleOption("activity", opt)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      activityPreferences.includes(opt)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">
                ¿Cuál es tu ritmo de viaje?
              </label>
              <div className="grid grid-cols-3 gap-4">
                {PACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setTravelPace(
                        opt.value as "relaxed" | "moderate" | "intense",
                      )
                    }
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      travelPace === opt.value
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <p className="font-semibold flex items-center gap-2 mb-1">
                      {opt.label} {opt.icon}
                    </p>
                    <p className="text-gray-400 text-xs">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white font-semibold mb-3 block">
                ¿Qué lugares te gustaría visitar?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={attractionInput}
                  onChange={(e) => setAttractionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAttraction()}
                  placeholder="Ej: Chichén Itzá"
                  className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddAttraction}
                  disabled={!attractionInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-semibold transition"
                >
                  ✓ Confirmar
                </button>
              </div>
              {attractions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {attractions.map((a, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full"
                    >
                      {a}
                      <button
                        onClick={() =>
                          setAttractions((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="text-gray-500 hover:text-red-400 transition ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-12">
          <button
            onClick={() => setStep((s) => s - 1)}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              step === 0
                ? "invisible"
                : "bg-gray-800 hover:bg-gray-700 text-white"
            }`}
          >
            ← Atrás
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              {loading ? "Guardando..." : "Entrar al viaje ✨"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default TravelerPreferences;
