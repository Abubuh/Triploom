import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./modules/auth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateTrip from "./pages/CreateTrip";
import TripDetail from "./pages/TripDetail";
import ResetPassword from "./pages/Resetpassword";
import InvitePage from "./pages/InvitePage";
import TravelerPreferences from "./pages/TravelerPreferences";

function AppContent() {
  const navigate = useNavigate();
  return (
    <AuthProvider onPendingInvite={(token) => navigate(`/invite/${token}`)}>
      <AppRoutes />
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">Cargando...</p>
      </div>
    );

  const isAuthenticated = user && profile;
  return (
    <Routes>
      <Route
        path="/"
        element={!isAuthenticated ? <Landing /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/auth"
        element={!isAuthenticated ? <Auth /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />}
      />
      <Route
        path="/trips/new"
        element={isAuthenticated ? <CreateTrip /> : <Navigate to="/auth" />}
      />
      <Route
        path="/trips/:id"
        element={isAuthenticated ? <TripDetail /> : <Navigate to="/auth" />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route
        path="/preferences/:tripId"
        element={
          isAuthenticated ? <TravelerPreferences /> : <Navigate to="/auth" />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
