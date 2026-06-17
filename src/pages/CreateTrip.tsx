import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTripStore } from "../store/tripStore";
import {
  FOOD_OPTIONS,
  ACTIVITY_OPTIONS,
  PACE_OPTIONS,
} from "../constants/tripOptions.tsx";
import CheckIcon from "../components/Icons/CheckIcon";
import StarsIcon from "../components/Icons/StarsIcon";
import House from "../components/Icons/House";
import HotelIcon from "../components/Icons/HotelIcon.tsx";

const STEPS = ["Informacion", "Destinos", "Alojamiento", "Preferencias"];

const inputCls =
  "w-full px-4 py-3 rounded-[14px] text-sm outline-none transition border border-border-base hover:border-brand-mid focus:border-text-base bg-white text-text-base placeholder-text-faint";

const selectArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23AAB8AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-start justify-center mb-16">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-[18px] border-2 transition-all ${
                i < step
                  ? "bg-brand-mid border-brand-mid text-white"
                  : i === step
                  ? "bg-text-base border-text-base text-btn-text"
                  : "bg-white border-border-base text-text-faint"
              }`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {i < step ? <CheckIcon /> : i + 1}
            </div>
            <span
              className={`text-[12px] font-bold whitespace-nowrap ${
                i === step
                  ? "text-text-base"
                  : i < step
                  ? "text-brand-mid"
                  : "text-text-faint"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-[72px] mx-3 mt-[-18px] transition-all shrink-0 ${
                i < step ? "bg-brand-mid" : "bg-border-base"
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
  const [newDestination, setNewDestination] = useState({ city: "", country: "", days: 1 });
  const [attractions, setAttractions] = useState<string[]>([]);
  const [attractionInput, setAttractionInput] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const store = useTripStore();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("currency").eq("id", user.id).single();
      if (data?.currency) store.setField("currency", data.currency);
    };
    fetchProfile();
  }, []);

  const toggleOption = (field: "foodPreferences" | "activityPreferences", value: string) => {
    const current = store[field];
    store.setField(
      field,
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
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
    const { data: { user } } = await supabase.auth.getUser();
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

    if (error || !trip) { setLoading(false); return; }

    await supabase.from("trip_members").insert({ trip_id: trip.id, user_id: user.id, role: "owner" });

    if (store.destinations.length > 0) {
      await supabase.from("destinations").insert(
        store.destinations.map((d, i) => ({
          trip_id: trip.id, city: d.city, country: d.country, days: d.days, order_index: i,
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

  const labelCls = "block text-[13px] font-bold text-text-muted mb-2";
  const errorCls = "mt-1 text-xs text-red-500";

  return (
    <div
      className="min-h-screen bg-surface-page text-text-base"
      style={{ fontFamily: "var(--font-body)" }}
    >
            <nav
        className="flex items-center justify-between px-16 border-b border-border-base bg-surface-page"
        style={{ height: 66 }}
      >
        <span
          className="text-[26px] text-text-base tracking-[-0.5px] cursor-default select-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          triploom
        </span>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm font-semibold text-text-muted hover:text-text-base transition-colors"
        >
          Cancelar
        </button>
      </nav>

      <main className="max-w-[680px] mx-auto px-8 py-14 w-full">
        <Stepper step={step} />

                {step === 0 && (
          <div className="animate-fadeUp">
            <div className="inline-flex bg-brand-light text-[#3A6E52] px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-[0.08em] mb-4">
              PASO 1 DE 4
            </div>
            <h2
              className="text-[44px] text-text-base leading-[1.05] tracking-[-1px] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Como se llama tu viaje?
            </h2>
            <p className="text-base text-text-muted mb-9 leading-[1.6]">
              Dale un nombre para identificarlo facilmente
            </p>

            <div className="flex flex-col gap-5 mb-10">
              <div>
                <label className={labelCls}>Nombre del viaje</label>
                <input
                  className={inputCls + (showErrors && !store.name ? " border-red-400" : "")}
                  placeholder="Ej: Verano en la playa"
                  value={store.name}
                  onChange={(e) => store.setField("name", e.target.value)}
                />
                {showErrors && !store.name && <p className={errorCls}>El nombre del viaje es obligatorio</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Fecha de inicio</label>
                  <input
                    type="date"
                    className={inputCls + (showErrors && !store.startDate ? " border-red-400" : "")}
                    value={store.startDate}
                    onChange={(e) => store.setField("startDate", e.target.value)}
                  />
                  {showErrors && !store.startDate && <p className={errorCls}>La fecha de inicio es obligatoria</p>}
                </div>
                <div>
                  <label className={labelCls}>Fecha de regreso</label>
                  <input
                    type="date"
                    className={inputCls + (showErrors && !store.endDate ? " border-red-400" : "")}
                    value={store.endDate}
                    onChange={(e) => store.setField("endDate", e.target.value)}
                  />
                  {showErrors && !store.endDate && <p className={errorCls}>La fecha de regreso es obligatoria</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Cuantas personas van?</label>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={store.totalPeople}
                    onChange={(e) => store.setField("totalPeople", Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Moneda del viaje</label>
                  <select
                    className={inputCls + " cursor-pointer appearance-none pr-10"}
                    style={{ backgroundImage: selectArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center" }}
                    value={store.currency}
                    onChange={(e) => store.setField("currency", e.target.value)}
                  >
                    {["MXN", "USD", "EUR", "GBP", "CAD", "ARS", "COP", "CLP"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {showErrors && store.startDate && store.endDate && (() => {
              const days = Math.round((new Date(store.endDate).getTime() - new Date(store.startDate).getTime()) / 86_400_000);
              return days > 14 ? (
                <p className="mt-2 mb-4 text-xs text-red-500">
                  El viaje dura {days} días. El máximo permitido es 14.
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
                  if (days > 14) {
                    setShowErrors(true);
                    return;
                  }
                  setShowErrors(false);
                  setStep(1);
                }}
                className="btn-primary"
              >
                Siguiente &rarr;
              </button>
            </div>
          </div>
        )}

                {step === 1 && (
          <div className="animate-fadeUp">
            <div className="inline-flex bg-brand-light text-[#3A6E52] px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-[0.08em] mb-4">
              PASO 2 DE 4
            </div>
            <h2
              className="text-[44px] text-text-base leading-[1.05] tracking-[-1px] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              A donde van?
            </h2>
            <p className="text-base text-text-muted mb-9">
              Agrega uno o varios destinos en orden
            </p>

            {store.destinations.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-5">
                {store.destinations.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-5 py-4 rounded-2xl bg-surface-mint border border-brand-light"
                  >
                    <div className="flex items-center gap-3 text-sm text-text-base">
                      <div className="w-7 h-7 rounded-full bg-brand-mid text-white flex items-center justify-center text-[14px] font-semibold shrink-0"
                           style={{ fontFamily: "var(--font-display)" }}>
                        {i + 1}
                      </div>
                      <span className="font-bold">{d.city}</span>
                      {d.country && <span className="text-text-muted">&middot; {d.country}</span>}
                      <span className="text-brand-mid font-semibold">
                        {d.days} {d.days === 1 ? "dia" : "dias"}
                      </span>
                    </div>
                    <button
                      onClick={() => store.removeDestination(i)}
                      className="text-text-faint hover:text-red-400 transition text-sm px-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-border-base rounded-2xl p-6 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input
                    className={inputCls}
                    placeholder="Ej: Guadalajara"
                    value={newDestination.city}
                    onChange={(e) => setNewDestination({ ...newDestination, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Pais</label>
                  <input
                    className={inputCls}
                    placeholder="Ej: Mexico"
                    value={newDestination.country}
                    onChange={(e) => setNewDestination({ ...newDestination, country: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Dias</label>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={newDestination.days}
                    onChange={(e) => setNewDestination({ ...newDestination, days: Number(e.target.value) })}
                  />
                </div>
              </div>
              <button
                onClick={handleAddDestination}
                className="w-full py-3 border-[1.5px] border-dashed border-brand-light rounded-[14px] bg-surface-page text-brand-mid text-sm font-bold hover:border-brand-mid transition-colors"
              >
                + Confirmar destino
              </button>
            </div>

            {showErrors && store.destinations.length === 0 && (
              <p className="mt-2 text-xs text-red-500">Agrega al menos un destino para continuar</p>
            )}

            <div className="flex items-center justify-between mt-10">
              <button onClick={() => { setShowErrors(false); setStep(0); }} className="btn-outline">
                &larr; Atras
              </button>
              <button
                onClick={() => {
                  if (store.destinations.length === 0) { setShowErrors(true); return; }
                  setShowErrors(false);
                  setStep(2);
                }}
                className="btn-primary"
              >
                Siguiente &rarr;
              </button>
            </div>
          </div>
        )}

                {step === 2 && (
          <div className="animate-fadeUp">
            <div className="inline-flex bg-brand-light text-[#3A6E52] px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-[0.08em] mb-4">
              PASO 3 DE 4
            </div>
            <h2
              className="text-[44px] text-text-base leading-[1.05] tracking-[-1px] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Como se van a alojar?
            </h2>
            <p className="text-base text-text-muted mb-9">
              Esto nos ayuda a darte mejores recomendaciones
            </p>

            <div className="grid grid-cols-2 gap-4 mb-7">
              {(
                [
                  { value: "together", label: "Todos juntos",   desc: "Un Airbnb o casa para el grupo", icon: <HotelIcon /> },
                  { value: "separate", label: "Por separado",   desc: "Cada quien elige su alojamiento", icon: <House /> },
                ] as const
              ).map((opt) => {
                const active = store.accommodationType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => store.setField("accommodationType", opt.value)}
                    className={`text-left px-6 py-7 rounded-2xl transition-all duration-150 border-2 cursor-pointer ${
                      active
                        ? "bg-surface-mint border-brand-mid"
                        : "bg-white border-border-base hover:border-brand-light"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${active ? "bg-brand-mid text-white" : "bg-surface-page text-text-muted"}`}>
                      {opt.icon}
                    </div>
                    <p
                      className="text-[22px] text-text-base mb-1.5"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {opt.label}
                    </p>
                    <p className="text-sm text-text-muted leading-[1.5]">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="mb-10">
              <label className={labelCls}>
                {store.accommodationType === "together"
                  ? `Presupuesto total del grupo para alojamiento (${store.currency})`
                  : `Tu presupuesto personal para alojamiento (${store.currency})`}
              </label>
              <input
                type="number"
                min={0}
                className={inputCls + (showErrors && !store.accommodationBudget ? " border-red-400" : "")}
                placeholder="0"
                value={store.accommodationBudget === 0 ? "" : store.accommodationBudget}
                onChange={(e) => store.setField("accommodationBudget", Number(e.target.value))}
              />
              {showErrors && !store.accommodationBudget && (
                <p className={errorCls}>Ingresa un presupuesto para el alojamiento</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => { setShowErrors(false); setStep(1); }} className="btn-outline">
                &larr; Atras
              </button>
              <button
                onClick={() => {
                  if (!store.accommodationBudget) { setShowErrors(true); return; }
                  setShowErrors(false);
                  setStep(3);
                }}
                className="btn-primary"
              >
                Siguiente &rarr;
              </button>
            </div>
          </div>
        )}

                {step === 3 && (
          <div className="animate-fadeUp">
            <div className="inline-flex bg-brand-light text-[#3A6E52] px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-[0.08em] mb-4">
              PASO 4 DE 4
            </div>
            <h2
              className="text-[44px] text-text-base leading-[1.05] tracking-[-1px] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tu estilo de viaje
            </h2>
            <p className="text-base text-text-muted mb-9">
              La IA usara esto para personalizar tu itinerario
            </p>

            <div className="flex flex-col gap-7">
              <div>
                <label className={labelCls}>{`Presupuesto personal total (${store.currency})`}</label>
                <input
                  type="number"
                  min={0}
                  className={inputCls + (showErrors && !store.budget ? " border-red-400" : "")}
                  placeholder="0"
                  value={store.budget === 0 ? "" : store.budget}
                  onChange={(e) => store.setField("budget", Number(e.target.value))}
                />
                {showErrors && !store.budget && <p className={errorCls}>Ingresa tu presupuesto personal</p>}
              </div>

              <div>
                <p className="text-base font-bold text-text-base mb-3">Que tipo de comida te gusta?</p>
                <div className="flex flex-wrap gap-2">
                  {FOOD_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => toggleOption("foodPreferences", opt)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
                        store.foodPreferences.includes(opt)
                          ? "bg-brand-light border-brand-mid text-brand-mid"
                          : "bg-white border-border-base text-text-muted hover:border-brand-mid"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {showErrors && store.foodPreferences.length === 0 && (
                  <p className={errorCls}>Selecciona al menos un tipo de comida</p>
                )}
              </div>

              <div>
                <p className="text-base font-bold text-text-base mb-3">Que actividades te interesan?</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => toggleOption("activityPreferences", opt)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
                        store.activityPreferences.includes(opt)
                          ? "bg-brand-light border-brand-mid text-brand-mid"
                          : "bg-white border-border-base text-text-muted hover:border-brand-mid"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {showErrors && store.activityPreferences.length === 0 && (
                  <p className={errorCls}>Selecciona al menos una actividad</p>
                )}
              </div>

              <div>
                <p className="text-base font-bold text-text-base mb-3">Cual es tu ritmo de viaje?</p>
                <div className="grid grid-cols-3 gap-3">
                  {PACE_OPTIONS.map((opt) => {
                    const active = store.travelPace === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => store.setField("travelPace", opt.value as "relaxed" | "moderate" | "intense")}
                        className={`text-left p-5 rounded-2xl transition-all border-2 cursor-pointer ${
                          active
                            ? "bg-surface-mint border-brand-mid"
                            : "bg-white border-border-base hover:border-brand-light"
                        }`}
                      >
                        <p className={`flex items-center gap-2 font-bold mb-1 text-sm ${active ? "text-brand-mid" : "text-text-muted"}`}>
                          {opt.icon} {opt.label}
                        </p>
                        <p className="text-xs text-text-muted">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-base font-bold text-text-base mb-3">Que lugares te gustaria visitar?</p>
                <div className="flex gap-3">
                  <input
                    className={inputCls + " flex-1"}
                    placeholder="Ej: Chichen Itza"
                    value={attractionInput}
                    onChange={(e) => setAttractionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAttraction()}
                  />
                  <button
                    onClick={handleAddAttraction}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-[14px] text-sm font-bold whitespace-nowrap transition bg-brand-light border border-brand-mid text-brand-mid hover:bg-brand-mid hover:text-white cursor-pointer"
                  >
                    Confirmar <CheckIcon />
                  </button>
                </div>
                {attractions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {attractions.map((a, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-white border border-border-base text-text-muted"
                      >
                        {a}
                        <button
                          onClick={() => setAttractions((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-text-faint hover:text-red-400 transition text-xs"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-10">
              <button onClick={() => { setShowErrors(false); setStep(2); }} className="btn-outline">
                &larr; Atras
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
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? "Creando viaje..." : <><span>Crear viaje</span> <StarsIcon /></>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CreateTrip;
