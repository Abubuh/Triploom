import { useEffect, useMemo, useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
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
import { GroupChatPanel } from "../components/TripDetail/GroupChatPanel";
import { EditTripModal } from "../components/TripDetail/EditTripModal";
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
import EditIcon from "../components/Icons/EditIcon.tsx";
import CheckIcon from "../components/Icons/CheckIcon.tsx";
import GroupIcon from "../components/Icons/GroupIcon.tsx";
import MoonIcon from "../components/Icons/MoonIcon.tsx";
import SunIcon from "../components/Icons/SunIcon.tsx";

const btnCls =
  "inline-flex items-center gap-2 px-[1.1rem] py-[0.65rem] bg-surface-card border border-border-base dark:border-[#4a6b57] text-text-base rounded-[0.65rem] text-[0.9rem] font-semibold cursor-pointer transition-all hover:bg-surface-subtle hover:border-brand-mid dark:text-text-faint";

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
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const burgerRef = useRef<HTMLDivElement>(null);
  const lastGeneratedRef = useRef<number>(0);
  const GENERATION_COOLDOWN_MS = 60_000;
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

  const { isDark, toggleTheme } = useTheme();

  const currentUserName = useMemo(
    () =>
      members.find((m) => m.user_id === currentUserId)?.profiles?.name ?? "Tú",
    [members, currentUserId],
  );

  const userCurrency = trip?.currency ?? "MXN";

  useEffect(() => {
    if (!burgerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (burgerRef.current && !burgerRef.current.contains(e.target as Node)) {
        setBurgerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [burgerOpen]);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: tripData } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();
      if (tripData) setTrip(tripData);

      const { data: destData } = await supabase
        .from("destinations")
        .select("*")
        .eq("trip_id", id)
        .order("order_index");
      if (destData) setDestinations(destData);

      const { data: itineraryData } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("trip_id", id)
        .order("day_number");
      if (itineraryData && itineraryData.length > 0) {
        const days = itineraryData.map((d) => d.activities);
        setItinerary({ summary: "", budgetWarnings: [], days });
      }

      const { data: membersData } = await supabase
        .from("trip_members")
        .select(`id, role, user_id, profiles (name, email)`)
        .eq("trip_id", id);

      const { data: prefsData } = await supabase
        .from("member_preferences")
        .select("*")
        .eq("trip_id", id);

      if (membersData) {
        const combined = membersData.map((m) => ({
          ...m,
          member_preferences:
            prefsData?.find((p) => p.user_id === m.user_id) ?? null,
        }));
        setMembers(combined as unknown as Member[]);
      }

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
    content += `${trip.start_date} → ${trip.end_date}\n\n`;
    if (itinerary.summary) content += `## Resumen\n${itinerary.summary}\n\n`;
    itinerary.days.forEach((day) => {
      content += `## Día ${day.day_number} — ${day.destination} (${day.date})\n\n`;
      day.activities.forEach((activity) => {
        content += `**${activity.time_start}–${activity.time_end} — ${activity.title}**\n`;
        content += `${activity.description}\n`;
        if (
          activity.estimated_cost &&
          (activity.estimated_cost.min > 0 || activity.estimated_cost.max > 0)
        ) {
          content += `${activity.estimated_cost.min}–${activity.estimated_cost.max} ${trip.currency ?? "MXN"}\n`;
        }
        content += "\n";
      });
      if (day.accommodation?.name) {
        content += `Alojamiento\n`;
        content += `${day.accommodation.name} — ${day.accommodation.zone}\n`;
        content += `${day.accommodation.amount} ${day.accommodation.currency}\n`;
        if (day.accommodation.airbnb_url)
          content += `Airbnb: ${day.accommodation.airbnb_url}\n`;
        if (day.accommodation.booking_url)
          content += `Booking: ${day.accommodation.booking_url}\n`;
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
    if (generating) return;

    const now = Date.now();
    const elapsed = now - lastGeneratedRef.current;
    if (elapsed < GENERATION_COOLDOWN_MS) {
      const segundosRestantes = Math.ceil((GENERATION_COOLDOWN_MS - elapsed) / 1000);
      showToast(`Espera ${segundosRestantes}s antes de volver a generar`);
      return;
    }

    setGenerating(true);
    try {
      const result = await generateItinerary({ trip, destinations, members });
      lastGeneratedRef.current = Date.now();
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

  const handleTripSaved = (
    updatedTrip: Trip,
    updatedDestinations: Destination[],
  ) => {
    setTrip(updatedTrip);
    setDestinations(updatedDestinations);
    setEditTripOpen(false);
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
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <p className="text-text-faint">Cargando viaje...</p>
      </div>
    );

  if (!trip)
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <p className="text-text-faint">Viaje no encontrado</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-surface-page text-text-base">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-10 py-5 sticky top-0 z-10 bg-surface-page/90 backdrop-blur-sm border-b border-border-base dark:border-[#4a6b57]">
        <span
          className="flex items-center gap-2 text-2xl font-bold tracking-tight cursor-pointer text-brand-dark dark:text-brand-light"
          onClick={() => navigate("/dashboard")}
        >
          <PlaneIcon /> Triploom
        </span>
        <div className="flex gap-3 items-center">
          <button
            onClick={toggleTheme}
            title="Cambiar tema"
            className="w-9 h-9 flex justify-center items-center rounded-lg text-base transition bg-surface-card border border-border-base dark:border-[#4a6b57] text-text-muted hover:border-brand-mid hover:text-brand-mid"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm font-medium transition text-text-muted hover:text-text-base"
          >
            ← Mis viajes
          </button>
        </div>
      </nav>

      <main className="max-w-270 mx-auto px-10 py-10 w-full space-y-11 dark:text-text-faint">
        <div className="flex items-start justify-between gap-8">
          <div>
            <h1
              className="font-bold tracking-tight mb-2 dark:text-brand-subtle"
              style={{ fontSize: "2.4rem", letterSpacing: "-0.02em" }}
            >
              {trip.name}
            </h1>
            <p className="text-sm mb-3 text-text-muted dark:text-text-faint">
              {trip.start_date} <span className="text-text-faint mx-1">→</span>{" "}
              {trip.end_date}
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full border border-border-base bg-surface-subtle text-text-muted dark:text-text-faint">
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

          {(isOwner || currentUserRole === "co-organizer") && (
            <div className="flex gap-2 shrink-0 flex-wrap ">
              <button onClick={() => setEditTripOpen(true)} className={btnCls}>
                <span className="text-text-faint ">
                  <EditIcon />
                </span>{" "}
                Editar
              </button>

              {isOwner && (
                <button
                  onClick={checkBeforeGenerate}
                  disabled={generating}
                  className={`${btnCls} ${generating ? "opacity-75" : ""}`}
                >
                  <span
                    className="text-text-faint inline-flex"
                    style={{
                      animation: generating
                        ? "spin 0.9s linear infinite"
                        : "none",
                    }}
                  >
                    {itinerary ? <RegenerateIcon /> : <StarsIcon />}
                  </span>
                  {generating
                    ? "Generando…"
                    : itinerary
                      ? "Regenerar"
                      : "Generar itinerario"}
                </button>
              )}

              {isOwner && itinerary && (
                <button onClick={handleDownloadItinerary} className={btnCls}>
                  <span className="text-text-faint">
                    <DownloadIcon />
                  </span>{" "}
                  Descargar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Destinos */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 font-bold text-[1.35rem] tracking-tight text-text-base dark:text-brand-subtle">
              <span className="text-brand-mid">
                <MapIcon />
              </span>
              Destino(s)
            </h3>
          </div>

          {destinations.length === 1 ? (
            <p className="text-[1.25rem] font-bold">
              {destinations[0].city},{" "}
              <span className="font-medium dark:text-text-faint">
                {destinations[0].country}
              </span>
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {destinations.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2">
                  <div className="px-4 py-3 rounded-xl bg-surface-card border border-border-base dark:border-[#4a6b57]">
                    <p className="font-semibold text-text-base">{d.city}</p>
                    <p className="text-sm text-text-faint">
                      {d.country} · {d.days} días
                    </p>
                  </div>
                  {i < destinations.length - 1 && (
                    <span className="text-text-faint">→</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

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

        {itinerary && (
          <div className="relative">
            {updatingItinerary && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-surface-page/70">
                <p className="text-sm font-semibold animate-pulse text-brand-mid">
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

      {/* FAB burger */}
      <div
        className={`fixed bottom-8 z-30 transition-all duration-300 ${chatOpen || groupChatOpen ? "right-8 md:right-104" : "right-8"}`}
      >
        <div ref={burgerRef} className="relative">
          {burgerOpen && (
            <div className="absolute bottom-full mb-3 right-0 w-52 z-40 animate-fadeIn shadow-xl bg-surface-card border border-border-base dark:border-[#4a6b57] rounded-[14px] p-2">
              <button
                onClick={() => {
                  setDocumentDrawerOpen(true);
                  setBurgerOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-subtle hover:text-text-base transition"
              >
                <DocumentIcon /> Documentos
              </button>
              <button
                onClick={() => {
                  setExpenseDrawerOpen(true);
                  setBurgerOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-subtle hover:text-text-base transition"
              >
                <MoneyIcon /> Gastos
              </button>
              <div className="border-t border-border-base my-1.5 mx-2" />
              <button
                onClick={() => {
                  setGroupChatOpen(true);
                  setChatOpen(false);
                  setBurgerOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-subtle hover:text-text-base transition"
              >
                <GroupIcon /> Chat del grupo
              </button>
              <button
                onClick={() => {
                  setChatOpen((prev) => !prev);
                  setGroupChatOpen(false);
                  setBurgerOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-subtle hover:text-text-base transition"
              >
                <StarsIcon /> Agente
              </button>
            </div>
          )}
          <button
            onClick={() => setBurgerOpen((prev) => !prev)}
            className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl shadow-lg transition bg-surface-card border border-border-base dark:border-[#4a6b57] hover:border-brand-mid"
          >
            <span className="block w-4 h-0.5 rounded-full bg-text-faint" />
            <span className="block w-4 h-0.5 rounded-full bg-text-faint" />
            <span className="block w-4 h-0.5 rounded-full bg-text-faint" />
          </button>
        </div>
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
      {trip && (
        <EditTripModal
          isOpen={editTripOpen}
          onClose={() => setEditTripOpen(false)}
          trip={trip}
          destinations={destinations}
          onSaved={handleTripSaved}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <div
          className="fixed bottom-7 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-surface-card border border-border-base dark:border-[#4a6b57] text-text-base shadow-[0_16px_40px_rgba(0,0,0,0.3)] dark:text-text-faint"
          style={{
            transform: "translateX(-50%)",
            animation: "toast-in 0.25s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-ready/15 text-ready">
            <CheckIcon />
          </span>
          {toastMessage}
        </div>
      )}

      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        itinerary={itinerary}
        trip={trip}
        onItineraryUpdate={handleChatItineraryUpdate}
      />
      {trip && (
        <GroupChatPanel
          isOpen={groupChatOpen}
          onClose={() => setGroupChatOpen(false)}
          tripId={trip.id}
          tripName={trip.name}
          currentUserId={currentUserId ?? ""}
          currentUserName={currentUserName}
        />
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default TripDetail;
