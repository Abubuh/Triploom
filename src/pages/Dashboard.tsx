import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Trip } from "../types/trip.types";
import PlaneIcon from "../components/Icons/PlaneIcon";
import UserIcon from "../components/Icons/UserIcon";
import MapIcon from "../components/Icons/MapIcon";
import House from "../components/Icons/House";
import HotelIcon from "../components/Icons/HotelIcon";
import DocumentIcon from "../components/Icons/DocumentIcon";
import CheckIcon from "../components/Icons/CheckIcon";
import EditIcon from "../components/Icons/EditIcon";
import TrashIcon from "../components/Icons/TrashIcon";

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [openMenuTripId, setOpenMenuTripId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState({ name: "", start_date: "", end_date: "" });
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, email, currency")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setCurrency(profileData.currency ?? "MXN");
      }
      const { data: memberTrips } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", user.id);

      if (memberTrips && memberTrips.length > 0) {
        const tripIds = memberTrips.map((m) => m.trip_id);
        const { data: tripsData } = await supabase
          .from("trips")
          .select("*")
          .in("id", tripIds)
          .order("created_at", { ascending: false });

        if (tripsData) setTrips(tripsData);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await supabase
      .from("profiles")
      .update({ currency: newCurrency })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);
  };

  const handleDeleteTrip = async (tripId: string) => {
    await supabase.from("trips").delete().eq("id", tripId);
    setTrips(trips.filter((t) => t.id !== tripId));
    setDeletingTripId(null);
  };

  const handleEditTrip = async () => {
    if (!editingTrip) return;
    await supabase
      .from("trips")
      .update({ name: editForm.name, start_date: editForm.start_date, end_date: editForm.end_date })
      .eq("id", editingTrip.id);
    setTrips(trips.map((t) => (t.id === editingTrip.id ? { ...t, ...editForm } : t)));
    setEditingTrip(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto border-b border-gray-800">
        <h1 className="text-2xl font-bold flex items-center gap-2 ">
          Triploom <PlaneIcon />
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm flex items-center gap-1">
            <UserIcon />
            Hola, {profile?.name || "Viajero"}
          </span>
          {currency && (
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-gray-800 text-gray-400 hover:text-white text-sm rounded-lg px-2 py-1 outline-none border border-gray-700 hover:border-gray-500 transition"
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="ARS">ARS</option>
              <option value="COP">COP</option>
              <option value="CLP">CLP</option>
            </select>
          )}
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition border-2 rounded-md px-2 py-1 border-gray-400 hover:border-white"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-1">Mis viajes</h2>
            <p className="text-gray-400">
              Organiza y planifica tus próximas aventuras
            </p>
          </div>
          <button
            onClick={() => navigate("/trips/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            + Nuevo viaje
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <p className="text-gray-400">Cargando viajes...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <span className="text-6xl mb-6">
              <MapIcon />
            </span>
            <h3 className="text-xl font-semibold mb-2">
              No tienes viajes todavía
            </h3>
            <p className="text-gray-400 mb-8">
              Crea tu primer viaje y empieza a planificar
            </p>
            <button
              onClick={() => navigate("/trips/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              Crear mi primer viaje
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => navigate(`/trips/${trip.id}`)}
                onMouseEnter={() => setHoveredTripId(trip.id)}
                onMouseLeave={() => {
                  setHoveredTripId(null);
                  setOpenMenuTripId(null);
                }}
                className="relative bg-gray-900 rounded-2xl p-6 cursor-pointer hover:bg-gray-800 transition"
              >
                {trip.owner_id === userId && hoveredTripId === trip.id && (
                  <div
                    className="absolute top-4 right-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setOpenMenuTripId(
                          openMenuTripId === trip.id ? null : trip.id,
                        )
                      }
                      className="text-gray-400 hover:text-white px-1 transition text-lg leading-none"
                    >
                      ⋮
                    </button>
                    {openMenuTripId === trip.id && (
                      <div className="absolute right-0 top-6 z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-max">
                        <button
                          onClick={() => {
                            setEditingTrip(trip);
                            setEditForm({
                              name: trip.name,
                              start_date: trip.start_date,
                              end_date: trip.end_date,
                            });
                            setOpenMenuTripId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition flex items-center gap-2"
                        >
                          <EditIcon /> Editar
                        </button>
                        <button
                          onClick={() => {
                            setDeletingTripId(trip.id);
                            setOpenMenuTripId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-red-400 transition flex items-center gap-2"
                        >
                          <TrashIcon /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{trip.name}</h3>
                <p className="text-gray-400 text-sm mb-3">
                  {trip.start_date} → {trip.end_date}
                </p>
                <div className="flex items-center justify-between">
                  <span className="bg-blue-500/10 text-blue-400 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    {trip.accommodation_type === "together" ? (
                      <>
                        <House />
                        Todos juntos
                      </>
                    ) : (
                      <>
                        <HotelIcon />
                        Todos separados
                      </>
                    )}
                  </span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${
                      trip.status === "planning"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {trip.status === "planning" ? (
                      <>
                        <DocumentIcon /> Planificando
                      </>
                    ) : (
                      <>
                        <CheckIcon />
                        Listo
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de edición */}
      {editingTrip && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full space-y-6">
            <h3 className="text-xl font-bold">Editar viaje</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Nombre</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-gray-800 rounded-xl px-4 py-2 text-white outline-none border border-gray-700 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Fecha de inicio</label>
                <input
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  className="w-full bg-gray-800 rounded-xl px-4 py-2 text-white outline-none border border-gray-700 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Fecha de fin</label>
                <input
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  className="w-full bg-gray-800 rounded-xl px-4 py-2 text-white outline-none border border-gray-700 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingTrip(null)}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditTrip}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {deletingTripId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full space-y-6">
            <h3 className="text-xl font-bold">¿Eliminar viaje?</h3>
            <p className="text-gray-400 text-sm">
              Esta acción no se puede deshacer. Se eliminará el viaje y todos sus datos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingTripId(null)}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTrip(deletingTripId)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
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
