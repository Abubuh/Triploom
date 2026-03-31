import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Trip } from "../types/trip.types";

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile(profileData);

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto border-b border-gray-800">
        <h1 className="text-2xl font-bold">Triploom ✈️</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            Hola, {profile?.name || "Viajero"} 👋
          </span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition"
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
            <span className="text-6xl mb-6">🗺️</span>
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
                className="bg-gray-900 rounded-2xl p-6 cursor-pointer hover:bg-gray-800 transition"
              >
                <h3 className="text-xl font-bold mb-2">{trip.name}</h3>
                <p className="text-gray-400 text-sm mb-3">
                  {trip.start_date} → {trip.end_date}
                </p>
                <div className="flex items-center justify-between">
                  <span className="bg-blue-500/10 text-blue-400 text-xs px-3 py-1 rounded-full">
                    {trip.accommodation_type === "together"
                      ? "🏠 Todos juntos"
                      : "🏨 Por separado"}
                  </span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      trip.status === "planning"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {trip.status === "planning"
                      ? "📋 Planificando"
                      : "✅ Listo"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
