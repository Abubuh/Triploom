import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../modules/auth";
import { Trip } from "../types/trip.types";
import CalendarIcon from "../components/Icons/CalendarIcon";
import GroupIcon from "../components/Icons/GroupIcon";
import UserIcon from "../components/Icons/UserIcon";
import EditIcon from "../components/Icons/EditIcon";
import TrashIcon from "../components/Icons/TrashIcon";
import MapIcon from "../components/Icons/MapIcon";

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
      className="bg-white rounded-3xl overflow-hidden cursor-pointer border border-border-base transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_28px_72px_rgba(12,26,15,0.10)] hover:border-brand-light relative"
      onClick={onClick}
    >
      <div className="bg-brand-light px-7 pt-6 pb-5 flex items-start justify-between">
        <h3 className="text-3xl text-text-base leading-none font-bold tracking-[-0.5px] font-display">
          {trip.name}
        </h3>
        {isOwner && (
          <div
            ref={menuRef}
            className="relative ml-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#3A6E52] hover:bg-[#b3e4c8] transition text-sm leading-none"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              &#8942;
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 rounded-2xl py-1.5 min-w-36 bg-white border border-border-base shadow-[0_8px_24px_rgba(12,26,15,0.12)]">
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:bg-surface-page hover:text-text-base transition"
                  onClick={() => {
                    onEdit();
                    setMenuOpen(false);
                  }}
                >
                  <EditIcon /> Editar
                </button>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-50 transition"
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

      {/* Bottom — white */}
      <div className="px-7 pt-4 pb-5 flex justify-between">
        <div className="flex flex-col gap-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="text-text-faint">
              <CalendarIcon />
            </span>
            {trip.start_date} &rarr; {trip.end_date}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
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
            {trip.expected_members && (
              <span className="text-brand-mid">
                &middot; {trip.expected_members} personas
              </span>
            )}
          </div>
        </div>

        <div className=" flex flex-col justify-center">
          <span
            className={`text-[11px] font-extrabold px-3.5 py-1.5 rounded-full border border-border-base bg-surface-page tracking-[0.04em] ${
              isPlanning ? "text-plan" : "text-ready"
            }`}
          >
            {isPlanning ? "Sin itinerario" : "Listo"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
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
    <div
      className="min-h-screen bg-surface-page text-text-base"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-10 flex items-center justify-between px-16 border-b border-border-base bg-surface-page"
        style={{ height: 66 }}
      >
        <button
          onClick={() => navigate("/")}
          className="text-[26px] text-text-base tracking-[-0.5px] bg-transparent cursor-pointer"
          style={{ fontFamily: "var(--font-display)" }}
        >
          triploom
        </button>
        <div className="flex items-center gap-7">
          <span className="text-sm font-semibold text-text-muted">
            Hola,{" "}
            <strong className="text-text-base">
              {profile?.name ?? "Viajero"}
            </strong>
          </span>
          {currency && (
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="border border-border-base rounded-full px-4 py-2 text-sm font-bold text-text-base bg-white outline-none cursor-pointer hover:border-brand-mid transition-colors"
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
            onClick={handleLogout}
            className="text-sm font-semibold text-text-muted hover:text-text-base transition-colors"
          >
            Salir
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="px-16 py-16 border-b border-border-base">
        <div className="max-w-[1200px] mx-auto flex items-end justify-between gap-8">
          <div>
            <div className="inline-flex bg-brand-light text-[#3A6E52] px-[18px] py-2 rounded-full text-[11px] font-extrabold tracking-[0.08em] mb-5">
              {trips.length} VIAJE{trips.length !== 1 ? "S" : ""} GUARDADO
              {trips.length !== 1 ? "S" : ""}
            </div>
            <h1
              className="text-[64px] text-text-base font-bold leading-[1.0] tracking-[-2px] mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Mis viajes
            </h1>
            <p className="text-[17px] text-text-muted leading-[1.6]">
              {planning} esperando planificacion &middot; {ready} listo
              {ready !== 1 ? "s" : ""}.
            </p>
          </div>
          <button
            onClick={() => navigate("/trips/new")}
            className="shrink-0 bg-text-base text-btn-text px-8 py-4 rounded-full text-[15px] font-extrabold whitespace-nowrap transition-all duration-150 hover:bg-brand-mid hover:-translate-y-px"
          >
            + Nuevo viaje
          </button>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-16 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <p className="text-text-faint">Cargando viajes...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 px-8 rounded-3xl bg-white border border-border-base">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-brand-mid bg-brand-light">
              <MapIcon />
            </div>
            <h2
              className="text-2xl mb-2 text-text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Aun no tienes viajes
            </h2>
            <p className="text-text-muted mb-6 max-w-sm mx-auto text-sm">
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
            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-9">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-[22px] py-2.5 rounded-full border text-sm font-bold transition-all duration-150 cursor-pointer ${
                    filter === key
                      ? "border-text-base bg-text-base text-white"
                      : "border-border-base bg-white text-text-muted hover:border-brand-mid"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-2 gap-5">
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="rounded-3xl p-8 max-w-md w-full space-y-6 bg-white border border-border-base shadow-[0_40px_120px_rgba(12,26,15,0.15)]">
            <h3
              className="text-[26px] text-text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Editar viaje
            </h3>
            <div className="space-y-4">
              {[
                { label: "Nombre", key: "name", type: "text" },
                { label: "Fecha de inicio", key: "start_date", type: "date" },
                { label: "Fecha de fin", key: "end_date", type: "date" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-[13px] font-bold text-text-muted block mb-1.5">
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="rounded-3xl p-8 max-w-md w-full space-y-4 bg-white border border-border-base shadow-[0_40px_120px_rgba(12,26,15,0.15)]">
            <h3
              className="text-[26px] text-text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Eliminar viaje?
            </h3>
            <p className="text-text-muted text-sm">
              Esta accion no se puede deshacer. Se eliminara el viaje y todos
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
                className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition cursor-pointer"
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
