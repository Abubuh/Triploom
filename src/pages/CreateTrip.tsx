import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTripStore } from "../store/tripStore";
import {
  FOOD_OPTIONS,
  ACTIVITY_OPTIONS,
  PACE_OPTIONS,
} from "../constants/tripOptions.tsx";
import PlaneIcon from "../components/Icons/PlaneIcon";
import CheckIcon from "../components/Icons/CheckIcon";
import StarsIcon from "../components/Icons/StarsIcon";
import House from "../components/Icons/House";
import HotelIcon from "../components/Icons/HotelIcon.tsx";

const STEPS = ["Información", "Destinos", "Alojamiento", "Preferencias"];

const inputCls =
  "w-full px-4 py-3 rounded-xl text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-900 border border-slate-300 dark:border-[#28344a] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500";

const selectArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center mb-11">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border ${
                i <= step
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500"
              } ${i === step ? "shadow-[0_0_0_4px_rgba(37,99,235,0.18)]" : ""}`}
            >
              {i < step ? <CheckIcon /> : i + 1}
            </div>
            <span
              className={`text-sm font-semibold hidden md:block ${
                i === step
                  ? "text-slate-900 dark:text-slate-100"
                  : i < step
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-3 min-w-6 transition-all ${
                i < step ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

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

  const [showErrors, setShowErrors] = useState(false);

  const store = useTripStore();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", user.id)
        .single();
      if (data?.currency) store.setField("currency", data.currency);
    };
    fetchProfile();
  }, []);

  const toggleOption = (
    field: "foodPreferences" | "activityPreferences",
    value: string,
  ) => {
    const current = store[field];
    store.setField(
      field,
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );
  };

  const handleAddDestination = () => {
    if (!newDestination.city) return;
    store.addDestination({ ...newDestination, days: Math.max(1, newDestination.days) });
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

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        name: store.name,
        owner_id: user.id,
        start_date: store.startDate,
        end_date: store.endDate,
        accommodation_type: store.accommodationType,
        status: "planning",
        expected_members: store.totalPeople,
        currency: store.currency,
      })
      .select()
      .single();

    if (error || !trip) {
      setLoading(false);
      return;
    }

    await supabase
      .from("trip_members")
      .insert({ trip_id: trip.id, user_id: user.id, role: "owner" });

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e1a] text-slate-900 dark:text-slate-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-10 py-5 border-b border-slate-200 dark:border-slate-800">
        <span
          className="flex items-center gap-2 text-2xl font-bold tracking-tight cursor-pointer"
          onClick={() => navigate("/dashboard")}
          style={{
            background: "linear-gradient(135deg, #60a5fa, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          <span style={{ WebkitTextFillColor: "#60a5fa" }}>
            <PlaneIcon />
          </span>
          Triploom
        </span>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm font-medium transition text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          Cancelar
        </button>
      </nav>

      <main className="max-w-[820px] mx-auto px-8 py-10 w-full">
        <Stepper step={step} />

        {/* Step 0 — Info */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              ¿Cómo se llama tu viaje?
            </h2>
            <p className="text-sm mb-8 text-slate-500 dark:text-slate-400">
              Dale un nombre para identificarlo fácilmente
            </p>

            <div className="mb-6">
              <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                Nombre del viaje
              </label>
              <input
                className={
                  inputCls +
                  (showErrors && !store.name
                    ? " border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "")
                }
                placeholder="Ej: Verano en la playa"
                value={store.name}
                onChange={(e) => store.setField("name", e.target.value)}
              />
              {showErrors && !store.name && (
                <p className="mt-1 text-xs text-red-500">
                  El nombre del viaje es obligatorio
                </p>
              )}
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    className={
                      inputCls +
                      (showErrors && !store.startDate
                        ? " border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "")
                    }
                    value={store.startDate}
                    onChange={(e) =>
                      store.setField("startDate", e.target.value)
                    }
                  />
                  {showErrors && !store.startDate && (
                    <p className="mt-1 text-xs text-red-500">
                      La fecha de inicio es obligatoria
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                    Fecha de regreso
                  </label>
                  <input
                    type="date"
                    className={
                      inputCls +
                      (showErrors && !store.endDate
                        ? " border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "")
                    }
                    value={store.endDate}
                    onChange={(e) => store.setField("endDate", e.target.value)}
                  />
                  {showErrors && !store.endDate && (
                    <p className="mt-1 text-xs text-red-500">
                      La fecha de regreso es obligatoria
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                ¿Cuántas personas van?
              </label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={store.totalPeople}
                onChange={(e) =>
                  store.setField("totalPeople", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-10">
              <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                Moneda del viaje
              </label>
              <select
                className={inputCls + " cursor-pointer appearance-none pr-10"}
                style={{
                  backgroundImage: selectArrow,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                }}
                value={store.currency}
                onChange={(e) => store.setField("currency", e.target.value)}
              >
                {["MXN", "USD", "EUR", "GBP", "CAD", "ARS", "COP", "CLP"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ),
                )}
              </select>
            </div>

            {showErrors && store.startDate && store.endDate && (() => {
              const days = Math.round((new Date(store.endDate).getTime() - new Date(store.startDate).getTime()) / 86_400_000);
              return days > 7 ? (
                <p className="mt-2 mb-4 text-xs text-red-500">
                  El viaje dura {days} días. El máximo permitido es 7.
                </p>
              ) : null;
            })()}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (!store.name || !store.startDate || !store.endDate) {
                    setShowErrors(true);
                    return;
                  }
                  const days = Math.round((new Date(store.endDate).getTime() - new Date(store.startDate).getTime()) / 86_400_000);
                  if (days > 7) {
                    setShowErrors(true);
                    return;
                  }
                  setShowErrors(false);
                  setStep(1);
                }}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition hover:-translate-y-px"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Destinos */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              ¿A dónde van?
            </h2>
            <p className="text-sm mb-8 text-slate-500 dark:text-slate-400">
              Agrega uno o varios destinos en orden
            </p>

            {store.destinations.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                {store.destinations.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#161e2e] border border-slate-300 dark:border-[#28344a]"
                  >
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-600">
                        {i + 1}
                      </span>
                      <span className="font-semibold">{d.city}</span>
                      {d.country && (
                        <span className="text-slate-400 dark:text-slate-500">
                          · {d.country}
                        </span>
                      )}
                      <span className="text-blue-400 dark:text-blue-400 font-semibold">
                        {d.days} {d.days === 1 ? "día" : "días"}
                      </span>
                    </div>
                    <button
                      onClick={() => store.removeDestination(i)}
                      className="text-slate-400 hover:text-red-400 transition text-sm px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                  Ciudad
                </label>
                <input
                  className={inputCls}
                  placeholder="Ej: Guadalajara"
                  value={newDestination.city}
                  onChange={(e) =>
                    setNewDestination({
                      ...newDestination,
                      city: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                  País
                </label>
                <input
                  className={inputCls}
                  placeholder="Ej: México"
                  value={newDestination.country}
                  onChange={(e) =>
                    setNewDestination({
                      ...newDestination,
                      country: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                  Días
                </label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={newDestination.days}
                  onChange={(e) =>
                    setNewDestination({
                      ...newDestination,
                      days: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <button
              onClick={handleAddDestination}
              className="w-full py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-blue-400 hover:border-blue-500 transition border-[1.5px] border-dashed border-slate-300 dark:border-slate-700 bg-transparent"
            >
              + Confirmar destino
            </button>

            {showErrors && store.destinations.length === 0 && (
              <p className="mt-2 mb-8 text-xs text-red-500">
                Agrega al menos un destino para continuar
              </p>
            )}
            {!(showErrors && store.destinations.length === 0) && (
              <div className="mb-10" />
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setShowErrors(false);
                  setStep(0);
                }}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                ← Atrás
              </button>
              <button
                onClick={() => {
                  if (store.destinations.length === 0) {
                    setShowErrors(true);
                    return;
                  }
                  setShowErrors(false);
                  setStep(2);
                }}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition hover:-translate-y-px"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Alojamiento */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              ¿Cómo se van a alojar?
            </h2>
            <p className="text-sm mb-8 text-slate-500 dark:text-slate-400">
              Esto nos ayuda a darte mejores recomendaciones
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {(
                [
                  {
                    value: "together",
                    label: "Todos juntos",
                    desc: "Un Airbnb o casa para el grupo",
                  },
                  {
                    value: "separate",
                    label: "Por separado",
                    desc: "Cada quien elige su alojamiento",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => store.setField("accommodationType", opt.value)}
                  className={`text-left p-5 rounded-2xl transition border-[1.5px] ${
                    store.accommodationType === opt.value
                      ? "bg-blue-500/10 border-blue-500"
                      : "bg-white dark:bg-gray-900 border-slate-300 dark:border-[#28344a] hover:border-blue-400"
                  }`}
                >
                  <p className="flex items-center gap-2 text-base font-bold mb-1 text-slate-900 dark:text-slate-100">
                    <span className="text-blue-500 dark:text-blue-400">
                      {opt.value === "together" ? <HotelIcon /> : <House />}
                    </span>
                    {opt.label}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="mb-10">
              <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">
                {store.accommodationType === "together"
                  ? `Presupuesto total del grupo para alojamiento (${store.currency})`
                  : `Tu presupuesto personal para alojamiento (${store.currency})`}
              </label>
              <input
                type="number"
                min={0}
                className={inputCls + (showErrors && !store.accommodationBudget ? " border-red-500 focus:border-red-500 focus:ring-red-500/20" : "")}
                placeholder="0"
                value={
                  store.accommodationBudget === 0
                    ? ""
                    : store.accommodationBudget
                }
                onChange={(e) =>
                  store.setField("accommodationBudget", Number(e.target.value))
                }
              />
              {showErrors && !store.accommodationBudget && (
                <p className="mt-1 text-xs text-red-500">Ingresa un presupuesto para el alojamiento</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setShowErrors(false); setStep(1); }}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                ← Atrás
              </button>
              <button
                onClick={() => {
                  if (!store.accommodationBudget) {
                    setShowErrors(true);
                    return;
                  }
                  setShowErrors(false);
                  setStep(3);
                }}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition hover:-translate-y-px"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Preferencias */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              Tu estilo de viaje
            </h2>
            <p className="text-sm mb-8 text-slate-500 dark:text-slate-400">
              La IA usará esto para personalizar tu itinerario
            </p>

            <div className="mb-7">
              <label className="block text-xs font-medium mb-2 text-slate-600 dark:text-slate-300">{`Presupuesto personal total (${store.currency})`}</label>
              <input
                type="number"
                min={0}
                className={inputCls + (showErrors && !store.budget ? " border-red-500 focus:border-red-500 focus:ring-red-500/20" : "")}
                placeholder="0"
                value={store.budget === 0 ? "" : store.budget}
                onChange={(e) =>
                  store.setField("budget", Number(e.target.value))
                }
              />
              {showErrors && !store.budget && (
                <p className="mt-1 text-xs text-red-500">Ingresa tu presupuesto personal</p>
              )}
            </div>

            <div className="mb-7">
              <p className="text-base font-bold mb-3">
                ¿Qué tipo de comida te gusta?
              </p>
              <div className="flex flex-wrap gap-2">
                {FOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleOption("foodPreferences", opt)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                      store.foodPreferences.includes(opt)
                        ? "bg-blue-500/15 border-blue-500 text-blue-300"
                        : "bg-slate-100 dark:bg-[#161e2e] border-slate-300 dark:border-[#28344a] text-slate-600 dark:text-slate-300 hover:border-blue-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {showErrors && store.foodPreferences.length === 0 && (
                <p className="mt-2 text-xs text-red-500">Selecciona al menos un tipo de comida</p>
              )}
            </div>

            <div className="mb-7">
              <p className="text-base font-bold mb-3">
                ¿Qué actividades te interesan?
              </p>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleOption("activityPreferences", opt)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                      store.activityPreferences.includes(opt)
                        ? "bg-blue-500/15 border-blue-500 text-blue-300"
                        : "bg-slate-100 dark:bg-[#161e2e] border-slate-300 dark:border-[#28344a] text-slate-600 dark:text-slate-300 hover:border-blue-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {showErrors && store.activityPreferences.length === 0 && (
                <p className="mt-2 text-xs text-red-500">Selecciona al menos una actividad</p>
              )}
            </div>

            <div className="mb-7">
              <p className="text-base font-bold mb-3">
                ¿Cuál es tu ritmo de viaje?
              </p>
              <div className="grid grid-cols-3 gap-3">
                {PACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      store.setField(
                        "travelPace",
                        opt.value as "relaxed" | "moderate" | "intense",
                      )
                    }
                    className={`text-left p-5 rounded-2xl transition border-[1.5px] ${
                      store.travelPace === opt.value
                        ? "bg-blue-500/10 border-blue-500"
                        : "bg-white dark:bg-gray-900 border-slate-300 dark:border-[#28344a] hover:border-blue-400"
                    }`}
                  >
                    <p className="flex items-center gap-2 font-bold mb-1 text-sm text-slate-900 dark:text-slate-100">
                      <span className="text-blue-500 dark:text-blue-400">
                        {opt.icon}
                      </span>{" "}
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <p className="text-base font-bold mb-3">
                ¿Qué lugares te gustaría visitar?
              </p>
              <div className="flex gap-3">
                <input
                  className={inputCls + " flex-1"}
                  placeholder="Ej: Chichén Itzá"
                  value={attractionInput}
                  onChange={(e) => setAttractionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAttraction()}
                />
                <button
                  onClick={handleAddAttraction}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition bg-blue-500/15 border border-blue-500 text-blue-300 hover:bg-blue-500/25"
                >
                  Confirmar <CheckIcon />
                </button>
              </div>
              {attractions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {attractions.map((a, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-slate-100 dark:bg-[#161e2e] border border-slate-300 dark:border-[#28344a] text-slate-600 dark:text-slate-300"
                    >
                      {a}
                      <button
                        onClick={() =>
                          setAttractions((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="text-slate-400 hover:text-red-400 transition text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setShowErrors(false); setStep(2); }}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                ← Atrás
              </button>
              <button
                onClick={() => {
                  if (!store.budget || store.foodPreferences.length === 0 || store.activityPreferences.length === 0) {
                    setShowErrors(true);
                    return;
                  }
                  handleSubmit();
                }}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition hover:-translate-y-px disabled:opacity-50"
              >
                {loading ? (
                  "Creando viaje..."
                ) : (
                  <>
                    Crear viaje <StarsIcon />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CreateTrip;
