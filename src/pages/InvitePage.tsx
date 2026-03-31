import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface InviteData {
  trip_id: string;
  trips: {
    name: string;
    start_date: string;
    end_date: string;
  };
}

function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error } = await supabase
        .from("trip_invitations")
        .select("trip_id, trips(name, start_date, end_date)")
        .eq("token", token)
        .is("used_by", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        setError("Esta invitación no es válida o ya fue usada.");
      } else {
        setInvite(data as unknown as InviteData);
      }
      setLoading(false);
    };

    fetchInvite();
  }, [token]);

  const handleJoin = async () => {
    if (!currentUser) {
      // Guarda el token y manda al login
      localStorage.setItem("pendingInviteToken", token!);
      navigate("/auth");
      return;
    }

    setJoining(true);

    // Verificar que no sea ya miembro
    const { data: existing } = await supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", invite!.trip_id)
      .eq("user_id", currentUser.id)
      .single();

    if (existing) {
      // Ya es miembro, ir directo al viaje
      navigate(`/trips/${invite!.trip_id}`);
      return;
    }

    // Agregar como miembro
    const { error: memberError } = await supabase.from("trip_members").insert({
      trip_id: invite!.trip_id,
      user_id: currentUser.id,
      role: "traveler",
    });

    if (memberError) {
      setError("Hubo un error al unirte al viaje.");
      setJoining(false);
      return;
    }

    // Marcar invitación como usada
    await supabase
      .from("trip_invitations")
      .update({ used_by: currentUser.id, used_at: new Date().toISOString() })
      .eq("token", token);

    navigate(`/trips/${invite!.trip_id}`);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">Cargando invitación...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="text-white font-semibold">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-blue-400 hover:underline text-sm"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        <p className="text-4xl">✈️</p>
        <div>
          <p className="text-gray-400 text-sm mb-1">Te invitaron a</p>
          <h1 className="text-2xl font-bold text-white">
            {invite?.trips.name}
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {invite?.trips.start_date} → {invite?.trips.end_date}
          </p>
        </div>
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition"
        >
          {joining
            ? "Uniéndose..."
            : currentUser
              ? "Unirme al viaje"
              : "Iniciar sesión para unirme"}
        </button>
      </div>
    </div>
  );
}

export default InvitePage;
