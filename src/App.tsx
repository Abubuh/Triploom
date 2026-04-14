import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateTrip from "./pages/CreateTrip";
import TripDetail from "./pages/TripDetail";
import ResetPassword from "./pages/Resetpassword";
import InvitePage from "./pages/InvitePage";
import TravelerPreferences from "./pages/TravelerPreferences";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === "SIGNED_IN" && session?.user) {
        const user = session.user;
        if (user.app_metadata.provider === "google") {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .single();
          if (!existingProfile) {
            await supabase.from("profiles").insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata.full_name ?? user.email,
              currency: "MXN",
            });
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">Cargando...</p>
      </div>
    );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={!session ? <Landing /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/auth"
          element={!session ? <Auth /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/auth" />}
        />
        <Route
          path="/trips/new"
          element={session ? <CreateTrip /> : <Navigate to="/auth" />}
        />
        <Route
          path="/trips/:id"
          element={session ? <TripDetail /> : <Navigate to="/auth" />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route
          path="/preferences/:tripId"
          element={session ? <TravelerPreferences /> : <Navigate to="/auth" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
