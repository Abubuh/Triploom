import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTripStore } from "../store/tripStore";
import {
  FOOD_OPTIONS,
  ACTIVITY_OPTIONS,
  PACE_OPTIONS,
} from "../constants/tripOptions.tsx";
import PlaneIcon from "../components/Icons/PlaneIcon";
import House from "../components/Icons/House";
import StarsIcon from "../components/Icons/StarsIcon";

const STEPS = ["Información", "Destinos", "Alojamiento", "Preferencias"];

function CreateTrip() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newDestination, setNewDestination] = useState({
    city: "",
    country: "",
    days: 1,
  });
  const [attractions, setAttractions] = useState<string[]>([]);
  const [attractionInput, setAttractionInput] = useState("");

  const store = useTripStore();

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const toggleOption = (
    field: "foodPreferences" | "activityPreferences",
    value: string,
  ) => {
    const current = store[field];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    store.setField(field, updated);
  };

  const handleAddDestination = () => {
    if (!newDestination.city) return;
    store.addDestination(newDestination);
    setNewDestination({ city: "", country: "", days: 1 });
  };

  const handleAddAttraction = () => {
    if (!attractionInput.trim()) return;
    setAttractions((prev) => [...prev, attractionInput.trim()]);
    setAttractionInput("");
  };

  const handleSubmit = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Crear el viaje
    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        name: store.name,
        owner_id: user.id,
        start_date: store.startDate,
        end_date: store.endDate,
        accommodation_type: store.accommodationType,
        status: "planning",
        expected_members: store.totalPeople, // ← agrega esto
      })
      .select()
      .single();

    if (error || !trip) {
      setLoading(false);
      return;
    }

    // Agregar destinos
    if (store.destinations.length > 0) {
      await supabase.from("destinations").insert(
        store.destinations.map((d, i) => ({
          trip_id: trip.id,
          city: d.city,
          country: d.country,
          days: d.days,
          order_index: i,
        })),
      );
    }

    // Agregar owner como miembro
    await supabase.from("trip_members").insert({
      trip_id: trip.id,
      user_id: user.id,
      role: "owner",
    });

    // Guardar preferencias
    await supabase.from("member_preferences").insert({
      trip_id: trip.id,
      user_id: user.id,
      budget: store.budget,
      food_preferences: store.foodPreferences,
      activity_preferences: store.activityPreferences,
      attractions_preferences: attractions,
      travel_pace: store.travelPace,
    });

    store.reset();
    setLoading(false);
    navigate(`/trips/${trip.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-3xl mx-auto border-b border-gray-800">
        <h1
          className="text-2xl font-bold cursor-pointer flex items-center gap-2"
          onClick={() => navigate("/dashboard")}
        >
          Triploom <PlaneIcon />
        </h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white text-sm transition"
        >
          Cancelar
        </button>
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

        {/* Step 1 — Información básica */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                ¿Cómo se llama tu viaje?
              </h2>
              <p className="text-gray-400">
                Dale un nombre para identificarlo fácilmente
              </p>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">
                Nombre del viaje
              </label>
              <input
                type="text"
                value={store.name}
                onChange={(e) => store.setField("name", e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Verano en la playa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={store.startDate}
                  onChange={(e) => store.setField("startDate", e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Fecha de regreso
                </label>
                <input
                  type="date"
                  value={store.endDate}
                  onChange={(e) => store.setField("endDate", e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">
                ¿Cuántas personas van?
              </label>
              <input
                type="number"
                min={1}
                value={store.totalPeople}
                onChange={(e) =>
                  store.setField("totalPeople", Number(e.target.value))
                }
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Step 2 — Destinos */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">¿A dónde van?</h2>
              <p className="text-gray-400">
                Agrega uno o varios destinos en orden
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-gray-400 text-sm mb-1 block">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={newDestination.city}
                  onChange={(e) =>
                    setNewDestination({
                      ...newDestination,
                      city: e.target.value,
                    })
                  }
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Guadalajara"
                />
              </div>
              <div className="col-span-1">
                <label className="text-gray-400 text-sm mb-1 block">País</label>
                <input
                  type="text"
                  value={newDestination.country}
                  onChange={(e) =>
                    setNewDestination({
                      ...newDestination,
                      country: e.target.value,
                    })
                  }
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: México"
                />
              </div>
              <div className="col-span-1">
                <label className="text-gray-400 text-sm mb-1 block">Días</label>
                <input
                  type="number"
                  min={1}
                  value={newDestination.days}
                  onChange={(e) =>
                    setNewDestination({
                      ...newDestination,
                      days: Number(e.target.value),
                    })
                  }
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleAddDestination}
              className="w-full border border-dashed border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400 rounded-lg py-3 transition"
            >
              + Confirmar destino
            </button>

            {store.destinations.length > 0 && (
              <div className="space-y-3">
                {store.destinations.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400 font-semibold">
                        #{i + 1}
                      </span>
                      <span>
                        {d.city}, {d.country}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {d.days} días
                      </span>
                    </div>
                    <button
                      onClick={() => store.removeDestination(i)}
                      className="text-gray-500 hover:text-red-400 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Alojamiento */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                ¿Cómo se van a alojar?
              </h2>
              <p className="text-gray-400">
                Esto nos ayuda a darte mejores recomendaciones
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  value: "together",
                  icon: <House />,
                  label: "Todos juntos",
                  desc: "Un Airbnb o casa para el grupo",
                },
                {
                  value: "separate",
                  icon: <House />,
                  label: "Por separado",
                  desc: "Cada quien elige su alojamiento",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    store.setField(
                      "accommodationType",
                      opt.value as "together" | "separate",
                    )
                  }
                  className={`p-6 rounded-xl border-2 text-left transition ${
                    store.accommodationType === opt.value
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-700 hover:border-gray-500"
                  }`}
                >
                  <p className="text-lg font-semibold mb-1 flex items-center gap-2">
                    {opt.icon}
                    {opt.label}
                  </p>
                  <p className="text-gray-400 text-sm">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">
                {store.accommodationType === "together"
                  ? "Presupuesto total del grupo para alojamiento (MXN)"
                  : "Tu presupuesto personal para alojamiento (MXN)"}
              </label>
              <input
                type="number"
                min={0}
                value={store.accommodationBudget}
                onChange={(e) =>
                  store.setField("accommodationBudget", Number(e.target.value))
                }
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 5000"
              />
            </div>
          </div>
        )}

        {/* Step 4 — Preferencias */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tu estilo de viaje</h2>
              <p className="text-gray-400">
                La IA usará esto para personalizar tu itinerario
              </p>
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">
                Presupuesto personal total (MXN)
              </label>
              <input
                type="number"
                min={0}
                value={store.budget}
                onChange={(e) =>
                  store.setField("budget", Number(e.target.value))
                }
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 15000"
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">
                ¿Qué tipo de comida te gusta?
              </label>
              <div className="flex flex-wrap gap-2">
                {FOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleOption("foodPreferences", opt)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      store.foodPreferences.includes(opt)
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
                    onClick={() => toggleOption("activityPreferences", opt)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      store.activityPreferences.includes(opt)
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
                      store.setField(
                        "travelPace",
                        opt.value as "relaxed" | "moderate" | "intense",
                      )
                    }
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      store.travelPace === opt.value
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <p className="font-semibold mb-1 flex items-center gap-2">
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
            onClick={handleBack}
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
              onClick={handleNext}
              disabled={step === 0 && !store.name}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50 flex"
            >
              {loading ? (
                "Creando viaje..."
              ) : (
                <>
                  Crear viaje
                  <StarsIcon />
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default CreateTrip;
