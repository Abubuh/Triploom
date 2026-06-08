import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import { useAuth } from "../modules/auth";
import { Trip } from "../types/trip.types";
import PlaneIcon from "../components/Icons/PlaneIcon";
import CalendarIcon from "../components/Icons/CalendarIcon";
import GroupIcon from "../components/Icons/GroupIcon";
import UserIcon from "../components/Icons/UserIcon";
import EditIcon from "../components/Icons/EditIcon";
import TrashIcon from "../components/Icons/TrashIcon";
import MapIcon from "../components/Icons/MapIcon";
import SunIcon from "../components/Icons/SunIcon";
import MoonIcon from "../components/Icons/MoonIcon";

type FilterKey = "todos" | "listos" | "planificando" | "grupo" | "solo";

function TripCard({
  trip,
  isOwner,
  onEdit,
  onDelete,
  onClick,
}: {
  trip: Trip;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isPlanning = trip.status === "planning";

  return (
    <div
      className="rounded-[0.85rem] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5  hover:border-brand-mid relative bg-surface-card border border-border-base dark:border-[#4a6b57]"
      onClick={onClick}
    >
      {/* Barra de estado */}

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold tracking-tight text-text-base dark:text-brand-light">
            {trip.name}
          </h3>
          {isOwner && (
            <div
              ref={menuRef}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="p-1 rounded text-text-faint hover:text-text-base hover:bg-surface-subtle transition text-lg leading-none"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 rounded-lg py-1.5 min-w-35 bg-surface-subtle border border-border-base shadow-[0_8px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:bg-brand-subtle hover:text-text-base transition"
                    onClick={() => {
                      onEdit();
                      setMenuOpen(false);
                    }}
                  >
                    <EditIcon /> Editar
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                  >
                    <TrashIcon /> Eliminar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-4 ">
          <div className="flex items-center gap-2 text-sm text-text-muted dark:text-slate-300">
            <span className="text-text-faint">
              <CalendarIcon />
            </span>
            {trip.start_date} → {trip.end_date}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted dark:text-slate-300">
            <span className="text-text-faint">
              {trip.accommodation_type === "together" ? (
                <GroupIcon />
              ) : (
                <UserIcon />
              )}
            </span>
            {trip.accommodation_type === "together"
              ? "Todos juntos"
              : "Por separado"}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-dashed border-border-base">
          <span
            className={`flex items-center gap-1.5 font-semibold ${isPlanning ? "text-plan" : "text-ready"}`}
          >
            {isPlanning ? "Sin itinerario" : "Listo"}
          </span>
          <span className="text-blue-500 dark:text-brand-light text-xs font-semibold">
            Ver detalles →
          </span>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setCurrency(profile.currency ?? "MXN");
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchTrips = async () => {
      const { data: memberTrips } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", user.id);
      if (memberTrips && memberTrips.length > 0) {
        const tripIds = memberTrips.map((m) => m.trip_id);
        const { data } = await supabase
          .from("trips")
          .select("*")
          .in("id", tripIds)
          .order("created_at", { ascending: false });
        if (data) setTrips(data);
      }
      setLoading(false);
    };
    fetchTrips();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    if (user)
      await supabase
        .from("profiles")
        .update({ currency: newCurrency })
        .eq("id", user.id);
  };

  const handleDeleteTrip = async (tripId: string) => {
    await supabase.from("trips").delete().eq("id", tripId);
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
    setDeletingTripId(null);
  };

  const handleEditTrip = async () => {
    if (!editingTrip) return;
    await supabase
      .from("trips")
      .update({
        name: editForm.name,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
      })
      .eq("id", editingTrip.id);
    setTrips((prev) =>
      prev.map((t) => (t.id === editingTrip.id ? { ...t, ...editForm } : t)),
    );
    setEditingTrip(null);
  };

  const planning = trips.filter((t) => t.status === "planning").length;
  const ready = trips.filter((t) => t.status !== "planning").length;

  const filteredTrips = trips.filter((t) => {
    if (filter === "listos") return t.status !== "planning";
    if (filter === "planificando") return t.status === "planning";
    if (filter === "grupo") return t.accommodation_type === "together";
    if (filter === "solo") return t.accommodation_type !== "together";
    return true;
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: "todos", label: `Todos (${trips.length})` },
    { key: "listos", label: `Listos (${ready})` },
    { key: "planificando", label: `Planificando (${planning})` },
    { key: "grupo", label: "En grupo" },
    { key: "solo", label: "Solo" },
  ];

  return (
    <div className="min-h-screen bg-surface-page text-text-base">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5 sticky top-0 z-10 bg-surface-page/90 backdrop-blur-sm border-b border-border-base dark:border-[#4a6b57]">
        <span className="flex items-center gap-2 text-2xl font-bold tracking-tight text-brand-dark dark:text-brand-light">
          <PlaneIcon /> Triploom
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card border border-border-base dark:border-[#4a6b57]">
            <span className="text-sm text-text-muted dark:text-brand-light">
              Hola,{" "}
              <strong className="text-text-base dark:text-slate-300">
                {profile?.name ?? "Viajero"}
              </strong>
            </span>
          </div>

          {currency && (
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="text-sm font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer transition bg-surface-card border border-border-base dark:border-[#4a6b57] text-text-base dark:text-brand-light"
            >
              {["MXN", "USD", "EUR", "GBP", "CAD", "ARS", "COP", "CLP"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ),
              )}
            </select>
          )}

          <button
            onClick={toggleTheme}
            title="Cambiar tema"
            className="w-9 h-9 flex justify-center items-center rounded-lg text-base transition bg-surface-card border border-border-base dark:border-[#4a6b57] text-text-muted hover:border-brand-mid hover:text-brand-mid dark:text-brand-light"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm font-medium transition bg-surface-card border border-border-base dark:border-[#4a6b57] text-text-muted hover:border-red-400 hover:text-red-400 dark:text-brand-light"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-325 mx-auto px-10 py-10 w-full">
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <p className="text-text-faint">Cargando viajes...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 px-8 rounded-2xl bg-surface-card border border-dashed border-border-base">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-brand-mid bg-brand-subtle">
              <MapIcon />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aún no tienes viajes</h2>
            <p className="text-text-muted mb-6 max-w-sm mx-auto">
              Empieza creando tu primer viaje y deja que la IA te ayude a
              planificarlo.
            </p>
            <button
              onClick={() => navigate("/trips/new")}
              className="btn-primary inline-flex items-center gap-2"
            >
              + Crear mi primer viaje
            </button>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="flex items-center justify-between gap-8 p-8 rounded-2xl mb-8 border border-border-base dark:border-[#4a6b57] bg-surface-subtle">
              <div>
                <h1 className="text-[2.1rem] dark:text-slate-200 font-bold tracking-tight mb-1">
                  Mis viajes
                </h1>
                <p className="text-text-muted dark:text-brand-subtle text-sm max-w-lg">
                  Tienes {trips.length} viaje{trips.length !== 1 ? "s" : ""}{" "}
                  guardado{trips.length !== 1 ? "s" : ""} — {planning} esperando
                  planificación y {ready} listo{ready !== 1 ? "s" : ""} para
                  vivir.
                </p>
              </div>
              <button
                onClick={() => navigate("/trips/new")}
                className="btn-primary shrink-0 flex items-center gap-2"
              >
                + Nuevo viaje
              </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-6">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-1.5 rounded-full text-sm transition border ${
                    filter === key
                      ? "border-brand-mid bg-brand-subtle dark:bg-brand-dark text-brand-dark dark:text-brand-light"
                      : "bg-transparent border-border-base dark:border-[#4a6b57] text-text-muted  hover:border-brand-mid"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  isOwner={trip.owner_id === user?.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  onEdit={() => {
                    setEditingTrip(trip);
                    setEditForm({
                      name: trip.name,
                      start_date: trip.start_date,
                      end_date: trip.end_date,
                    });
                  }}
                  onDelete={() => setDeletingTripId(trip.id)}
                />
              ))}
            </div>

            {filteredTrips.length === 0 && (
              <div className="text-center py-12 text-text-faint text-sm">
                No hay viajes que coincidan con el filtro seleccionado.
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal editar */}
      {editingTrip && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="rounded-2xl p-8 max-w-md w-full space-y-6 bg-surface-card border border-border-base dark:border-[#4a6b57]">
            <h3 className="text-xl font-bold text-text-base">Editar viaje</h3>
            <div className="space-y-4">
              {[
                { label: "Nombre", key: "name", type: "text" },
                { label: "Fecha de inicio", key: "start_date", type: "date" },
                { label: "Fecha de fin", key: "end_date", type: "date" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-sm mb-1 block text-text-muted">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={editForm[key as keyof typeof editForm]}
                    onChange={(e) =>
                      setEditForm({ ...editForm, [key]: e.target.value })
                    }
                    className="input-base"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingTrip(null)}
                className="btn-outline px-5 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditTrip}
                className="btn-primary px-5 py-2 text-sm"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {deletingTripId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="rounded-2xl p-8 max-w-md w-full space-y-4 bg-surface-card border border-border-base dark:border-[#4a6b57]">
            <h3 className="text-xl font-bold text-text-base">
              ¿Eliminar viaje?
            </h3>
            <p className="text-text-muted text-sm">
              Esta acción no se puede deshacer. Se eliminará el viaje y todos
              sus datos.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setDeletingTripId(null)}
                className="btn-outline px-5 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTrip(deletingTripId)}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
