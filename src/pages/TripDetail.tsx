import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Trip, Destination, Member } from "../types/trip.types";
import { generateItinerary } from "../lib/claude";
import { GeneratedItinerary } from "../types/trip.types";
import { ExpenseDrawer } from "../components/ExpenseDrawer";
import { DocumentDrawer } from "../components/DocumentDrawer";
import { WarningModal } from "../components/TripDetail/WarningModal";
import { MembersSection } from "../components/TripDetail/MembersSection";
import { ItinerarySection } from "../components/TripDetail/ItinerarySection";
import { ChatPanel } from "../components/TripDetail/ChatPanel";
import PlaneIcon from "../components/Icons/PlaneIcon";
import House from "../components/Icons/House";
import HotelIcon from "../components/Icons/HotelIcon.tsx";
import Hourglass from "../components/Icons/Hourglass.tsx";
import RegenerateIcon from "../components/Icons/RegenerateIcon.tsx";
import StarsIcon from "../components/Icons/StarsIcon.tsx";
import DownloadIcon from "../components/Icons/DownloadIcon.tsx";
import MapIcon from "../components/Icons/MapIcon.tsx";
import DocumentIcon from "../components/Icons/DocumentIcon.tsx";
import MoneyIcon from "../components/Icons/MoneyIcon.tsx";
import CheckIcon from "../components/Icons/CheckIcon.tsx";

function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [myBudget, setMyBudget] = useState<number | null>(null);
  const [documentDrawerOpen, setDocumentDrawerOpen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [updatingItinerary, setUpdatingItinerary] = useState(false);
  const [pendingAccommodationExpense, setPendingAccommodationExpense] =
    useState<{
      amount: number;
      currency: string;
      suggestion: string;
      date: string;
      trip_day: number;
    } | null>(null);
  const currentUserRole = useMemo(() => {
    return members.find((m) => m.user_id === currentUserId)?.role ?? null;
  }, [members, currentUserId]);
  const userCurrency = trip?.currency ?? "MXN";

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch trip
      const { data: tripData } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();

      if (tripData) setTrip(tripData);

      // Fetch destinations
      const { data: destData } = await supabase
        .from("destinations")
        .select("*")
        .eq("trip_id", id)
        .order("order_index");

      if (destData) setDestinations(destData);

      // Fetch itinerario
      const { data: itineraryData } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("trip_id", id)
        .order("day_number");

      if (itineraryData && itineraryData.length > 0) {
        const days = itineraryData.map((d) => d.activities);
        setItinerary({
          summary: "",
          budgetWarnings: [],
          days,
        });
      }

      // Fetch members con preferencias
      const { data: membersData } = await supabase
        .from("trip_members")
        .select(
          `
    id,
    role,
    user_id,
    profiles (name, email)
  `,
        )
        .eq("trip_id", id);

      // Fetch preferencias por separado
      const { data: prefsData } = await supabase
        .from("member_preferences")
        .select("*")
        .eq("trip_id", id);

      // Combinarlos
      if (membersData) {
        const combined = membersData.map((m) => ({
          ...m,
          member_preferences:
            prefsData?.find((p) => p.user_id === m.user_id) ?? null,
        }));
        setMembers(combined as unknown as Member[]);
      }

      // Fetch mi presupuesto personal
      if (user) {
        const { data: myPrefs } = await supabase
          .from("member_preferences")
          .select("budget")
          .eq("trip_id", id)
          .eq("user_id", user.id)
          .single();

        if (myPrefs) setMyBudget(myPrefs.budget);
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const isOwner = trip?.owner_id === currentUserId;

  const handleDownloadItinerary = () => {
    if (!itinerary || !trip) return;

    let content = `# ${trip.name}\n`;
    content += `📅 ${trip.start_date} → ${trip.end_date}\n\n`;

    if (itinerary.summary) {
      content += `## Resumen\n${itinerary.summary}\n\n`;
    }

    itinerary.days.forEach((day) => {
      content += `## Día ${day.day_number} — ${day.destination} (${day.date})\n\n`;
      day.activities.forEach((activity) => {
        content += `**${activity.time_start}–${activity.time_end} — ${activity.title}**\n`;
        content += `${activity.description}\n`;
        if (activity.estimated_cost && (activity.estimated_cost.min > 0 || activity.estimated_cost.max > 0)) {
          content += `💰 ${activity.estimated_cost.min}–${activity.estimated_cost.max} ${trip.currency ?? "MXN"}\n`;
        }
        content += "\n";
      });
      if (day.accommodation?.name) {
        content += `### 🏠 Alojamiento\n`;
        content += `${day.accommodation.name} — ${day.accommodation.zone}\n`;
        content += `💰 ${day.accommodation.amount} ${day.accommodation.currency}\n`;
        if (day.accommodation.airbnb_url) content += `Airbnb: ${day.accommodation.airbnb_url}\n`;
        if (day.accommodation.booking_url) content += `Booking: ${day.accommodation.booking_url}\n`;
      }
      content += "\n---\n\n";
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip.name.replace(/\s+/g, "_")}_itinerario.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const checkBeforeGenerate = () => {
    const newWarnings: string[] = [];

    if (trip!.expected_members && members.length < trip!.expected_members) {
      newWarnings.push(
        `Esperabas ${trip!.expected_members} viajeros pero solo ${members.length} se ${members.length === 1 ? "ha unido" : "han unido"}.`,
      );
    }

    const withoutPrefs = members.filter((m) => !m.member_preferences);
    if (withoutPrefs.length > 0) {
      const names = withoutPrefs.map((m) => m.profiles?.name).join(", ");
      newWarnings.push(
        `Los siguientes viajeros no han puesto sus preferencias: ${names}.`,
      );
    }

    if (newWarnings.length > 0) {
      setWarnings(newWarnings);
      setShowWarningModal(true);
    } else {
      handleGenerateItinerary();
    }
  };

  const handleGenerateItinerary = async () => {
    if (!trip) return;
    setGenerating(true);
    try {
      const result = await generateItinerary({ trip, destinations, members });
      setItinerary(result);
      await supabase.from("itinerary_days").delete().eq("trip_id", trip.id);

      await supabase.from("itinerary_days").insert(
        result.days.map((day) => ({
          trip_id: trip.id,
          day_number: day.day_number,
          date: day.date,
          destination: day.destination,
          activities: day,
        })),
      );

      // Actualizar status del viaje
      await supabase
        .from("trips")
        .update({ status: "ready" })
        .eq("id", trip.id);
    } catch (error) {
      console.error("Error generando itinerario:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleChatItineraryUpdate = async (updated: GeneratedItinerary) => {
    if (!trip) return;
    setUpdatingItinerary(true);
    try {
      setItinerary(updated);
      await supabase.from("itinerary_days").delete().eq("trip_id", trip.id);
      await supabase.from("itinerary_days").insert(
        updated.days.map((day) => ({
          trip_id: trip.id,
          day_number: day.day_number,
          date: day.date,
          destination: day.destination,
          activities: day,
        })),
      );
      showToast("Itinerario actualizado");
    } catch (err) {
      console.error("Error actualizando itinerario desde chat:", err);
      showToast("Error al actualizar el itinerario");
    } finally {
      setUpdatingItinerary(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">Cargando viaje...</p>
      </div>
    );

  if (!trip)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">Viaje no encontrado</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto border-b border-gray-800">
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
          ← Mis viajes
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-12 space-y-10">
        {/* Header del viaje */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-4xl font-bold mb-2">{trip.name}</h2>
            <p className="text-gray-400">
              {trip.start_date} → {trip.end_date}
            </p>
            <span className=" mt-2 bg-blue-500/10 text-blue-400 text-sm px-3 py-1 rounded-full flex items-center gap-1 w-max ">
              {trip.accommodation_type === "together" ? (
                <>
                  <House /> Todos juntos
                </>
              ) : (
                <>
                  <HotelIcon /> Por separado
                </>
              )}
            </span>
          </div>
          {isOwner && (
            <div className="flex gap-3">
              {itinerary && (
                <button
                  onClick={checkBeforeGenerate}
                  disabled={generating}
                  className="border flex gap-1 items-center border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      Generando...
                      <Hourglass />
                    </>
                  ) : (
                    <>
                      Regenerar
                      <RegenerateIcon />
                    </>
                  )}
                </button>
              )}
              {!itinerary && (
                <button
                  onClick={checkBeforeGenerate}
                  disabled={generating}
                  className="bg-blue-600 flex items-center gap-1 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      Generando
                      <Hourglass />
                    </>
                  ) : (
                    <>
                      Generar itinerario
                      <StarsIcon />
                    </>
                  )}
                </button>
              )}
              {itinerary && (
                <button
                  onClick={handleDownloadItinerary}
                  className="border border-gray-700 flex gap-1 hover:border-gray-500 text-gray-400 hover:text-white px-6 py-3 rounded-xl font-semibold transition"
                >
                  Descargar
                  <DownloadIcon />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Destinos */}
        <section>
          <h3 className="text-xl flex gap-1 items-center font-semibold mb-4">
            <MapIcon />
            Destino(s)
          </h3>

          {destinations.length === 1 ? (
            <p className="text-lg font-semibold">
              {destinations[0].city},{" "}
              <span className="text-gray-400 font-normal">
                {destinations[0].country}
              </span>
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {destinations.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2">
                  <div className="bg-gray-800 rounded-xl px-4 py-3">
                    <p className="font-semibold">{d.city}</p>
                    <p className="text-gray-400 text-sm">
                      {d.country} · {d.days} días
                    </p>
                  </div>
                  {i < destinations.length - 1 && (
                    <span className="text-gray-600">→</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Miembros y preferencias */}
        <MembersSection
          trip={trip}
          members={members}
          isOwner={isOwner}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          userCurrency={userCurrency}
          onMembersChange={setMembers}
          showToast={showToast}
        />
        {/* Itinerario */}
        {itinerary && (
          <div className="relative">
            {updatingItinerary && (
              <div className="absolute inset-0 bg-gray-950/70 z-10 flex items-center justify-center rounded-2xl">
                <p className="text-blue-400 text-sm font-semibold animate-pulse">
                  Actualizando itinerario...
                </p>
              </div>
            )}
            <ItinerarySection
              trip={trip}
              itinerary={itinerary}
              isOwner={isOwner}
              currentUserRole={currentUserRole}
              userCurrency={userCurrency}
              onItineraryChange={setItinerary}
              onPendingAccommodationExpense={setPendingAccommodationExpense}
            />
          </div>
        )}
      </main>
      {/* Botones flotantes */}
      <div
        className={`fixed bottom-8 flex gap-3 z-30 transition-all duration-300 ${
          chatOpen ? "right-8 md:right-[26rem]" : "right-8"
        }`}
      >
        <button
          onClick={() => setDocumentDrawerOpen(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg transition flex items-center gap-2"
        >
          <DocumentIcon /> Documentos
        </button>
        <button
          onClick={() => setExpenseDrawerOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg transition flex items-center gap-2"
        >
          <MoneyIcon /> Gastos
        </button>
        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg transition flex items-center gap-2"
        >
          <StarsIcon /> Agente
        </button>
      </div>
      {trip && (
        <ExpenseDrawer
          trip={trip}
          isOpen={expenseDrawerOpen}
          onClose={() => setExpenseDrawerOpen(false)}
          itineraryDays={itinerary?.days ?? []}
          myBudget={myBudget}
          userCurrency={userCurrency}
          pendingAccommodationExpense={pendingAccommodationExpense}
          onAccommodationExpenseDone={() =>
            setPendingAccommodationExpense(null)
          }
        />
      )}
      {trip && (
        <DocumentDrawer
          trip={trip}
          isOpen={documentDrawerOpen}
          onClose={() => setDocumentDrawerOpen(false)}
        />
      )}
      <WarningModal
        isOpen={showWarningModal}
        warnings={warnings}
        onClose={() => setShowWarningModal(false)}
        onConfirm={() => {
          setShowWarningModal(false);
          handleGenerateItinerary();
        }}
      />

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50 transition">
          <CheckIcon /> {toastMessage}
        </div>
      )}

      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        itinerary={itinerary}
        trip={trip}
        onItineraryUpdate={handleChatItineraryUpdate}
      />
    </div>
  );
}

export default TripDetail;
