import { useEffect, useMemo, useState, useRef } from "react";
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
import House from "../components/Icons/House";
import HotelIcon from "../components/Icons/HotelIcon.tsx";
import RegenerateIcon from "../components/Icons/RegenerateIcon.tsx";
import StarsIcon from "../components/Icons/StarsIcon.tsx";
import DownloadIcon from "../components/Icons/DownloadIcon.tsx";
import MapIcon from "../components/Icons/MapIcon.tsx";
import DocumentIcon from "../components/Icons/DocumentIcon.tsx";
import MoneyIcon from "../components/Icons/MoneyIcon.tsx";
import EditIcon from "../components/Icons/EditIcon.tsx";
import CheckIcon from "../components/Icons/CheckIcon.tsx";
import GroupIcon from "../components/Icons/GroupIcon.tsx";

const btnCls =
  "inline-flex items-center gap-2 px-[1.1rem] py-[0.65rem] bg-white border border-border-base text-text-base rounded-full text-[0.9rem] font-semibold cursor-pointer transition-all hover:bg-surface-subtle hover:border-brand-mid";

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
    <div
      className="min-h-screen bg-surface-page text-text-base"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Navbar */}
      <nav
        className="flex items-center justify-between px-16 sticky top-0 z-10 bg-surface-page border-b border-border-base"
        style={{ height: 66 }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          className="text-[26px] text-text-base tracking-[-0.5px] bg-transparent cursor-pointer"
          style={{ fontFamily: "var(--font-display)" }}
        >
          triploom
        </button>
        <div className="flex gap-2.5 items-center">
          {(isOwner || currentUserRole === "co-organizer") && (
            <button onClick={() => setEditTripOpen(true)} className={btnCls}>
              <span className="text-text-faint">
                <EditIcon />
              </span>{" "}
              Editar
            </button>
          )}
          {isOwner && (
            <button
              onClick={checkBeforeGenerate}
              disabled={generating}
              className={`${btnCls} ${generating ? "opacity-75" : ""}`}
            >
              <span
                className="text-text-faint inline-flex"
                style={{
                  animation: generating ? "spin 0.9s linear infinite" : "none",
                }}
              >
                {itinerary ? <RegenerateIcon /> : <StarsIcon />}
              </span>
              {generating
                ? "Generando..."
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
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm font-semibold text-text-muted hover:text-text-base transition-colors ml-1"
          >
            &larr; Mis viajes
          </button>
        </div>
      </nav>

      {/* Hero header */}
      <div className="bg-brand-mid px-16 py-16">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-8 flex-wrap">
          <div>
            <div
              className="inline-flex mb-5 px-[18px] py-2 rounded-full text-[11px] font-extrabold tracking-[0.08em]"
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              {trip.accommodation_type === "together"
                ? "TODOS JUNTOS"
                : "POR SEPARADO"}
            </div>
            <h1
              className="text-[64px] text-white leading-[1.0] tracking-[-2px] mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {trip.name}
            </h1>
            {destinations.length > 0 && (
              <p
                className="text-[18px] mb-4"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {destinations.map((d) => d.city).join(" · ")}
              </p>
            )}
            <div
              className="flex items-center gap-5 text-[15px] font-semibold flex-wrap"
              style={{ color: "rgba(255,255,255,0.88)" }}
            >
              <span>
                {trip.start_date} &rarr; {trip.end_date}
              </span>
              <span style={{ opacity: 0.35 }}>&middot;</span>
              <span>
                {members.length} {members.length === 1 ? "miembro" : "miembros"}
              </span>
            </div>
          </div>
          <div
            className="shrink-0 rounded-[20px] px-8 py-5 text-center"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <div
              className="text-[11px] font-extrabold tracking-[0.1em] mb-2"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              ESTADO
            </div>
            <div className="text-[22px] font-extrabold text-white">
              {trip.status === "planning" ? "Sin itinerario" : "Listo"}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="max-w-[1200px] mx-auto px-16 py-10 grid grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left sidebar */}
        <div className="flex flex-col gap-5">
          {/* Destinations card */}
          <div className="bg-white rounded-3xl p-7 border border-border-base">
            <h2
              className="text-[22px] text-text-base mb-4 font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Destino(s)
            </h2>
            {destinations.map((d, i) => (
              <div
                key={d.id}
                className={`py-2.5 text-[15px] font-semibold text-text-base ${
                  i < destinations.length - 1
                    ? "border-b border-border-base"
                    : ""
                }`}
              >
                {d.city}
                <span className="text-text-muted font-normal">
                  , {d.country}
                </span>
                {d.days && (
                  <span className="text-text-faint font-normal">
                    {" "}
                    &middot; {d.days} dias
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Members */}
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
        </div>

        {/* Right: Itinerary */}
        <div>
          {itinerary ? (
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
          ) : (
            <div className="bg-white rounded-3xl border border-border-base p-10 flex flex-col items-center justify-center text-center min-h-[320px]">
              <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center text-brand-mid mb-4">
                <StarsIcon />
              </div>
              <h3
                className="text-[22px] text-text-base mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sin itinerario aun
              </h3>
              <p className="text-text-muted text-sm max-w-[280px]">
                {isOwner
                  ? "Genera el itinerario cuando todos los viajeros hayan completado sus preferencias."
                  : "El organizador aun no ha generado el itinerario."}
              </p>
              {isOwner && (
                <button
                  onClick={checkBeforeGenerate}
                  disabled={generating}
                  className="mt-6 btn-primary flex items-center gap-2"
                >
                  <span
                    className="inline-flex"
                    style={{
                      animation: generating
                        ? "spin 0.9s linear infinite"
                        : "none",
                    }}
                  >
                    <StarsIcon />
                  </span>
                  {generating ? "Generando..." : "Generar itinerario"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB burger */}
      <div
        className={`fixed bottom-8 z-30 transition-all duration-300 ${chatOpen || groupChatOpen ? "right-8 md:right-104" : "right-8"}`}
      >
        <div ref={burgerRef} className="relative">
          {burgerOpen && (
            <div className="absolute bottom-full mb-3 right-0 w-52 z-40 animate-fadeIn shadow-[0_20px_60px_rgba(12,26,15,0.15)] bg-white border border-border-base rounded-[20px] p-2">
              <button
                onClick={() => {
                  setDocumentDrawerOpen(true);
                  setBurgerOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-text-muted hover:bg-surface-page hover:text-text-base transition"
              >
                <DocumentIcon /> Documentos
              </button>
              <button
                onClick={() => {
                  setExpenseDrawerOpen(true);
                  setBurgerOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-text-muted hover:bg-surface-page hover:text-text-base transition"
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-text-muted hover:bg-surface-page hover:text-text-base transition"
              >
                <GroupIcon /> Chat del grupo
              </button>
              <button
                onClick={() => {
                  setChatOpen((prev) => !prev);
                  setGroupChatOpen(false);
                  setBurgerOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-text-muted hover:bg-surface-page hover:text-text-base transition"
              >
                <StarsIcon /> Agente
              </button>
            </div>
          )}
          <button
            onClick={() => setBurgerOpen((prev) => !prev)}
            className="w-[52px] h-[52px] rounded-full shadow-[0_8px_28px_rgba(12,26,15,0.28)] flex flex-col items-center justify-center gap-1 transition-colors bg-brand-dark hover:bg-brand-mid cursor-pointer"
          >
            <span className="block w-4 h-0.5 rounded-full bg-white" />
            <span className="block w-4 h-0.5 rounded-full bg-white" />
            <span className="block w-4 h-0.5 rounded-full bg-white" />
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
          className="fixed bottom-7 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold bg-white border border-border-base text-text-base shadow-[0_16px_40px_rgba(12,26,15,0.15)]"
          style={{
            transform: "translateX(-50%)",
            animation: "toast-in 0.25s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-brand-light text-brand-mid">
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
    </div>
  );
}

export default TripDetail;
