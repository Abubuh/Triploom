import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Trip, Destination, Member } from "../types/trip.types";
import { generateItinerary } from "../lib/claude";
import { GeneratedItinerary } from "../types/trip.types";
import { ExpenseDrawer } from "../components/ExpenseDrawer";
import { DocumentDrawer } from "../components/DocumentDrawer";
import {
  FOOD_OPTIONS,
  ACTIVITY_OPTIONS,
  PACE_OPTIONS,
} from "../constants/tripOptions.tsx";
import PlaneIcon from "../components/Icons/PlaneIcon";
import House from "../components/Icons/House";
import HotelIcon from "../components/Icons/HotelIcon.tsx";
import Hourglass from "../components/Icons/Hourglass.tsx";
import RegenerateIcon from "../components/Icons/RegenerateIcon.tsx";
import StarsIcon from "../components/Icons/StarsIcon.tsx";
import DownloadIcon from "../components/Icons/DownloadIcon.tsx";
import MapIcon from "../components/Icons/MapIcon.tsx";
import GroupIcon from "../components/Icons/GroupIcon.tsx";
import CrownIcon from "../components/Icons/CrownIcon.tsx";
import EditIcon from "../components/Icons/EditIcon.tsx";
import PinIcon from "../components/Icons/PinIcon.tsx";
import CalendarIcon from "../components/Icons/CalendarIcon.tsx";
import WarningIcon from "../components/Icons/WarningIcon.tsx";
import TrashIcon from "../components/Icons/TrashIcon.tsx";
import DocumentIcon from "../components/Icons/DocumentIcon.tsx";
import MoneyIcon from "../components/Icons/MoneyIcon.tsx";
import CheckIcon from "../components/Icons/CheckIcon.tsx";
import CoOrganizerIcon from "../components/Icons/CoOrganizerIcon.tsx";

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
  const [editingActivity, setEditingActivity] = useState<{
    dayIndex: number;
    activityIndex: number;
  } | null>(null);
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [myBudget, setMyBudget] = useState<number | null>(null);
  const [documentDrawerOpen, setDocumentDrawerOpen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [editForm, setEditForm] = useState({
    budget: 0,
    foodPreferences: [] as string[],
    activityPreferences: [] as string[],
    attractionsPreferences: [] as string[],
    travelPace: "moderate" as "relaxed" | "moderate" | "intense",
  });
  const [attractionInput, setAttractionInput] = useState("");
  const [editingAccommodation, setEditingAccommodation] = useState<
    number | null
  >(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [roleMenuOpenFor, setRoleMenuOpenFor] = useState<string | null>(null);
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

  const handleUpdateActivity = async (
    dayIndex: number,
    activityIndex: number,
    field: "title" | "description" | "time" | "estimatedCost",
    value: string,
  ) => {
    if (!itinerary) return;

    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex].activities[activityIndex] = {
      ...updatedDays[dayIndex].activities[activityIndex],
      [field]: value,
    };

    setItinerary({ ...itinerary, days: updatedDays });

    // Guardar en Supabase
    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip?.id)
      .eq("day_number", updatedDays[dayIndex].day);
  };

  const handleOpenEditPrefs = () => {
    const myMember = members.find((m) => m.user_id === currentUserId);
    const prefs = myMember?.member_preferences;
    if (!prefs) return;

    setEditForm({
      budget: prefs.budget,
      foodPreferences: prefs.food_preferences,
      activityPreferences: prefs.activity_preferences,
      attractionsPreferences: prefs.attractions_preferences ?? [],
      travelPace: prefs.travel_pace,
    });
    setEditingPrefs(true);
  };

  const handleSavePrefs = async () => {
    const { error } = await supabase
      .from("member_preferences")
      .update({
        budget: editForm.budget,
        food_preferences: editForm.foodPreferences,
        activity_preferences: editForm.activityPreferences,
        attractions_preferences: editForm.attractionsPreferences,
        travel_pace: editForm.travelPace,
      })
      .eq("trip_id", trip!.id)
      .eq("user_id", currentUserId!);

    if (!error) {
      // Actualizar state local
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === currentUserId
            ? {
                ...m,
                member_preferences: {
                  ...m.member_preferences!,
                  budget: editForm.budget,
                  food_preferences: editForm.foodPreferences,
                  activity_preferences: editForm.activityPreferences,
                  attractions_preferences: editForm.attractionsPreferences,
                  travel_pace: editForm.travelPace,
                },
              }
            : m,
        ),
      );
      setEditingPrefs(false);
      showToast("Preferencias actualizadas ✓");
    }
  };

  const handleAddActivity = async (
    dayIndex: number,
    position: "before" | "after",
    activityIndex: number,
  ) => {
    if (!itinerary) return;

    const newActivity = {
      time: "12:00",
      title: "Nueva actividad",
      description: "Descripción de la actividad",
      type: "activity" as const,
      estimatedCost: "",
    };

    const updatedDays = [...itinerary.days];
    const activities = [...updatedDays[dayIndex].activities];

    // Si no hay actividades o es -1, simplemente agrega al final
    const insertAt =
      activities.length === 0 || activityIndex === -1
        ? 0
        : position === "before"
          ? activityIndex
          : activityIndex + 1;

    activities.splice(insertAt, 0, newActivity);
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], activities };

    setItinerary({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip?.id)
      .eq("day_number", updatedDays[dayIndex].day);

    setEditingActivity({ dayIndex, activityIndex: insertAt });
  };

  const handleDeleteDay = async (dayIndex: number) => {
    if (!itinerary) return;
    if (!confirm("¿Seguro que quieres eliminar este día?")) return;

    const updatedDays = itinerary.days
      .filter((_, i) => i !== dayIndex)
      .map((d, idx) => ({ ...d, day: idx + 1 }));

    setItinerary({ ...itinerary, days: updatedDays });

    await supabase.from("itinerary_days").delete().eq("trip_id", trip!.id);
    if (updatedDays.length > 0) {
      await supabase.from("itinerary_days").insert(
        updatedDays.map((d) => ({
          trip_id: trip!.id,
          day_number: d.day,
          date: d.date,
          destination: d.destination,
          activities: d,
        })),
      );
    }
  };
  const handleDeleteActivity = async (
    dayIndex: number,
    activityIndex: number,
  ) => {
    if (!itinerary) return;
    if (!confirm("¿Seguro que quieres eliminar esta actividad?")) return;

    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex].activities = updatedDays[dayIndex].activities.filter(
      (_, i) => i !== activityIndex,
    );

    setItinerary({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip?.id)
      .eq("day_number", updatedDays[dayIndex].day);
  };

  const handleCopyInviteLink = async () => {
    // Crear invitación en Supabase
    const { data, error } = await supabase
      .from("trip_invitations")
      .insert({ trip_id: trip!.id, created_by: currentUserId })
      .select("token")
      .single();

    if (error || !data) return;

    const link = `${window.location.origin}/invite/${data.token}`;
    await navigator.clipboard.writeText(link);
    showToast("¡Link copiado! Compártelo con quien quieras invitar.");
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!confirm("¿Seguro que quieres remover a este viajero?")) return;

    // Borrar preferencias
    await supabase
      .from("member_preferences")
      .delete()
      .eq("trip_id", trip!.id)
      .eq("user_id", memberUserId);

    // Borrar miembro
    await supabase.from("trip_members").delete().eq("id", memberId);

    // Actualizar state
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleChangeRole = async (
    memberId: string,
    newRole: "co-organizer" | "traveler",
  ) => {
    const { error } = await supabase
      .from("trip_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) return;

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
    );
    setRoleMenuOpenFor(null);
  };

  const handleUpdateDay = async (
    dayIndex: number,
    field: "destination" | "date",
    value: string,
  ) => {
    if (!itinerary) return;

    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      [field]: value,
    };

    setItinerary({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ [field]: value, activities: updatedDays[dayIndex] })
      .eq("trip_id", trip?.id)
      .eq("day_number", updatedDays[dayIndex].day);
  };

  const handleLeaveTrip = async () => {
    if (!confirm("¿Seguro que quieres salir de este viaje?")) return;

    const member = members.find((m) => m.user_id === currentUserId);
    if (!member) return;

    await supabase
      .from("member_preferences")
      .delete()
      .eq("trip_id", trip!.id)
      .eq("user_id", currentUserId!);

    await supabase.from("trip_members").delete().eq("id", member.id);

    navigate("/dashboard");
  };

  const handleDownloadItinerary = () => {
    if (!itinerary || !trip) return;

    let content = `# ${trip.name}\n`;
    content += `📅 ${trip.start_date} → ${trip.end_date}\n\n`;

    if (itinerary.summary) {
      content += `## Resumen\n${itinerary.summary}\n\n`;
    }

    itinerary.days.forEach((day) => {
      content += `## Día ${day.day} — ${day.destination} (${day.date})\n\n`;
      day.activities.forEach((activity) => {
        content += `**${activity.time} — ${activity.title}**\n`;
        content += `${activity.description}\n`;
        if (activity.estimatedCost) content += `💰 ${activity.estimatedCost}\n`;
        content += "\n";
      });
      if (day.accommodation) {
        content += `### 🏠 Alojamiento\n`;
        content += `${day.accommodation.suggestion} — ${day.accommodation.zone}\n`;
        content += `💰 ${day.accommodation.amount} ${day.accommodation.currency}\n`;
        if (day.accommodation.accommodationLink) {
          content += `Reserva: ${day.accommodation.accommodationLink}\n`;
        }
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

  const handleAddDay = async (
    position: "before" | "after",
    dayIndex: number,
  ) => {
    if (!itinerary) return;

    const referenceDay = itinerary.days[dayIndex];
    const referenceDate = new Date(referenceDay.date);

    const newDate = new Date(referenceDate);
    if (position === "before") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }

    const newDay = {
      day: 0, // se recalcula abajo
      date: newDate.toISOString().split("T")[0],
      destination: referenceDay.destination,
      activities: [],
      accommodation: undefined,
    };

    const updatedDays = [...itinerary.days];
    const insertAt = position === "before" ? dayIndex : dayIndex + 1;
    updatedDays.splice(insertAt, 0, newDay);

    // Recalcular números de día
    const renumbered = updatedDays.map((d, idx) => ({ ...d, day: idx + 1 }));

    setItinerary({ ...itinerary, days: renumbered });

    // Borrar y reinsertar todos los días en Supabase
    await supabase.from("itinerary_days").delete().eq("trip_id", trip!.id);
    await supabase.from("itinerary_days").insert(
      renumbered.map((d) => ({
        trip_id: trip!.id,
        day_number: d.day,
        date: d.date,
        destination: d.destination,
        activities: d,
      })),
    );
  };

  const handleUpdateAccommodation = async (
    dayIndex: number,
    field: "suggestion" | "zone" | "amount" | "currency" | "accommodationLink",
    value: string | number,
  ) => {
    if (!itinerary) return;
    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      accommodation: {
        ...updatedDays[dayIndex].accommodation!,
        [field]: value,
      },
    };
    setItinerary({ ...itinerary, days: updatedDays });
    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip?.id)
      .eq("day_number", updatedDays[dayIndex].day);
  };

  const handleAddAccommodation = async (dayIndex: number) => {
    if (!itinerary) return;

    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      accommodation: {
        suggestion: "",
        zone: "",
        amount: 0,
        currency: userCurrency,
        accommodationLink: "",
      },
    };

    setItinerary({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip?.id)
      .eq("day_number", updatedDays[dayIndex].day);

    setEditingAccommodation(dayIndex);
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
          day_number: day.day,
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
            Ruta
          </h3>
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
        </section>

        {/* Miembros y preferencias */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex gap-1 items-center">
              <GroupIcon /> Viajeros
            </h3>
            {isOwner && (
              <button
                onClick={handleCopyInviteLink}
                className="text-blue-400 hover:text-blue-300 text-sm transition"
              >
                + Invitar persona
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((m) => (
              <div key={m.id} className="bg-gray-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{m.profiles?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs flex gap-2 items-center px-3 py-1 rounded-full font-medium ${
                        m.role === "owner"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : m.role === "co-organizer"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {m.role === "owner" ? (
                        <>
                          <CrownIcon /> Owner
                        </>
                      ) : m.role === "co-organizer" ? (
                        <>
                          <CoOrganizerIcon /> Co-organizador
                        </>
                      ) : (
                        <>
                          <PlaneIcon />
                          Viajero
                        </>
                      )}
                    </span>

                    {/* Kebab menu para cambiar rol (solo owner, solo no-owners) */}
                    {isOwner && m.role !== "owner" && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setRoleMenuOpenFor(
                              roleMenuOpenFor === m.id ? null : m.id,
                            )
                          }
                          className="text-gray-500 hover:text-white px-1 transition text-lg leading-none"
                        >
                          ⋮
                        </button>
                        {roleMenuOpenFor === m.id && (
                          <div className="absolute right-0 top-6 z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-max">
                            <button
                              onClick={() =>
                                handleChangeRole(
                                  m.id,
                                  m.role === "co-organizer"
                                    ? "traveler"
                                    : "co-organizer",
                                )
                              }
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition"
                            >
                              {m.role === "co-organizer"
                                ? "Cambiar a viajero"
                                : "Hacer co-organizador"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Owner puede remover a otros */}
                    {isOwner && m.user_id !== currentUserId && (
                      <button
                        onClick={() => handleRemoveMember(m.id, m.user_id)}
                        className="text-gray-600 hover:text-red-400 transition text-sm"
                      >
                        ✕
                      </button>
                    )}

                    {/* Cualquier miembro puede salirse (excepto owner) */}
                    {m.user_id === currentUserId && !isOwner && (
                      <button
                        onClick={handleLeaveTrip}
                        className="text-gray-600 hover:text-red-400 text-xs transition"
                      >
                        Salir
                      </button>
                    )}
                  </div>
                </div>

                {m.member_preferences && (
                  <div className="space-y-3 border-t border-gray-800 pt-3">
                    {m.user_id === currentUserId && (
                      <div className=" flex flex-col items-end">
                        <button
                          onClick={handleOpenEditPrefs}
                          className="text-gray-500  flex gap-2 hover:text-blue-400 w-fit text-xs transition"
                        >
                          Editar
                          <EditIcon />
                        </button>
                      </div>
                    )}
                    {m.member_preferences.food_preferences?.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Comida</p>
                        <div className="flex flex-wrap gap-1">
                          {m.member_preferences.food_preferences.map((f) => (
                            <span
                              key={f}
                              className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.member_preferences.activity_preferences?.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm mb-2">
                          Actividades
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {m.member_preferences.activity_preferences.map(
                            (a) => (
                              <span
                                key={a}
                                className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full"
                              >
                                {a}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {m.member_preferences.attractions_preferences?.length >
                      0 && (
                      <div>
                        <p className="text-gray-400 text-sm mb-2">
                          Lugares de interés
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {m.member_preferences.attractions_preferences.map(
                            (a) => (
                              <span
                                key={a}
                                className="bg-gray-800 text-gray-300 text-xs px-2 flex gap-1 items-center py-1 rounded-full"
                              >
                                <PinIcon /> {a}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        {/* Itinerario */}
        {itinerary && (
          <section>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <CalendarIcon /> Itinerario
            </h3>
            <p className="text-gray-400 mb-6">{itinerary.summary}</p>

            {itinerary.budgetWarnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <p className="text-yellow-400 font-semibold mb-2">
                  <WarningIcon /> Advertencias de presupuesto
                </p>
                {itinerary.budgetWarnings.map((w, i) => (
                  <p key={i} className="text-yellow-300 text-sm">
                    {w}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-6">
              {itinerary.days.map((day, dayIndex) => (
                <div key={day.day} className="relative group/day">
                  {/* Botón agregar día ANTES */}
                  {(isOwner || currentUserRole === "co-organizer") && (
                    <button
                      onClick={() => handleAddDay("before", dayIndex)}
                      className="w-full text-gray-600 hover:text-blue-400 hover:bg-gray-800/50 text-xs py-2 rounded-xl transition border border-dashed border-transparent hover:border-gray-700 mb-2 "
                    >
                      + Agregar día aquí
                    </button>
                  )}

                  <div className="bg-gray-900 rounded-2xl p-6">
                    {/* ... todo el contenido del día que ya tienes ... */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                        Día {day.day}
                      </span>

                      {editingDay === dayIndex ? (
                        <div
                          className="flex items-center gap-2 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="date"
                            value={day.date}
                            onChange={(e) =>
                              handleUpdateDay(dayIndex, "date", e.target.value)
                            }
                            className="bg-gray-800 text-white rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={day.destination}
                            onChange={(e) =>
                              handleUpdateDay(
                                dayIndex,
                                "destination",
                                e.target.value,
                              )
                            }
                            className="flex-1 bg-gray-800 text-white rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Destino"
                          />
                          <button
                            onClick={() => setEditingDay(null)}
                            className="text-blue-400 text-xs hover:underline shrink-0"
                          >
                            ✓ Listo
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-400 text-sm">
                            {day.date}
                          </span>
                          <span className="text-white font-semibold">
                            {day.destination}
                          </span>
                          {(isOwner || currentUserRole === "co-organizer") && (
                            <button
                              onClick={() => setEditingDay(dayIndex)}
                              className="text-gray-600 hover:text-yellow-400 text-xs transition "
                            >
                              <EditIcon />
                            </button>
                          )}
                          {(isOwner || currentUserRole === "co-organizer") && (
                            <button
                              onClick={() => handleDeleteDay(dayIndex)}
                              className="text-gray-600 hover:text-red-400 text-xs transition"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      {day.activities.map((activity, i) => (
                        <div key={i} className="relative group/activity">
                          {/* Botón agregar ANTES */}
                          {(isOwner || currentUserRole === "co-organizer") && (
                            <div className="flex items-center gap-2 opacity-0 group-hover/activity:opacity-100 transition my-1">
                              <div className="flex-1 h-px bg-gray-800" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddActivity(dayIndex, "before", i);
                                }}
                                className="text-gray-600 hover:text-blue-400 hover:bg-gray-800 text-xs px-3 py-0.5 rounded-full transition shrink-0"
                              >
                                + Agregar antes
                              </button>
                              <div className="flex-1 h-px bg-gray-800" />
                            </div>
                          )}

                          <div
                            className="flex gap-4 group cursor-pointer"
                            onClick={() => {
                              if (
                                currentUserRole !== "owner" &&
                                currentUserRole !== "co-organizer"
                              )
                                return;
                              setEditingActivity(
                                editingActivity?.dayIndex === dayIndex &&
                                  editingActivity?.activityIndex === i
                                  ? null
                                  : { dayIndex, activityIndex: i },
                              );
                            }}
                          >
                            <span className="text-gray-500 text-sm w-12 shrink-0">
                              {activity.time}
                            </span>
                            <div className="flex-1">
                              {editingActivity?.dayIndex === dayIndex &&
                              editingActivity?.activityIndex === i ? (
                                <div
                                  className="space-y-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="time"
                                    value={activity.time}
                                    onChange={(e) =>
                                      handleUpdateActivity(
                                        dayIndex,
                                        i,
                                        "time",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <input
                                    type="text"
                                    value={activity.title}
                                    onChange={(e) =>
                                      handleUpdateActivity(
                                        dayIndex,
                                        i,
                                        "title",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />

                                  <textarea
                                    value={activity.description}
                                    onChange={(e) =>
                                      handleUpdateActivity(
                                        dayIndex,
                                        i,
                                        "description",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={2}
                                  />
                                  <input
                                    type="text"
                                    value={activity.estimatedCost ?? ""}
                                    onChange={(e) =>
                                      handleUpdateActivity(
                                        dayIndex,
                                        i,
                                        "estimatedCost",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Costo estimado (ej. $200 MXN)"
                                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => setEditingActivity(null)}
                                    className="text-blue-400 text-xs hover:underline border border-blue-400 px-3 py-1 rounded-full transition "
                                  >
                                    ✓ Listo
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="font-semibold text-sm group-hover:text-blue-400 transition flex gap-2 items-center">
                                    {activity.title}
                                    {(isOwner ||
                                      currentUserRole === "co-organizer") && (
                                      <span className="text-gray-600 hover:text-yellow-400 text-xs ml-2 items-center text-center opacity-0 group-hover:opacity-100 flex gap-1 transition">
                                        Editar
                                        <EditIcon />
                                      </span>
                                    )}
                                    {"  "}
                                    {(isOwner ||
                                      currentUserRole === "co-organizer") && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteActivity(dayIndex, i);
                                        }}
                                        className="text-gray-600 flex items-center hover:text-red-400 text-xs transition opacity-0 group-hover:opacity-100 gap-1"
                                      >
                                        Eliminar <TrashIcon />
                                      </button>
                                    )}
                                  </p>

                                  <p className="text-gray-400 text-sm">
                                    {activity.description}
                                  </p>
                                  {activity.estimatedCost && (
                                    <p className="text-blue-400 text-xs mt-1">
                                      {activity.estimatedCost}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Botón agregar DESPUÉS */}
                          {(isOwner || currentUserRole === "co-organizer") && (
                            <div className="flex items-center gap-2 opacity-0 group-hover/activity:opacity-100 transition my-1">
                              <div className="flex-1 h-px bg-gray-800" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddActivity(dayIndex, "after", i);
                                }}
                                className="text-gray-600 hover:text-blue-400 hover:bg-gray-800 text-xs px-3 py-0.5 rounded-full transition shrink-0"
                              >
                                + Agregar despues
                              </button>
                              <div className="flex-1 h-px bg-gray-800" />
                            </div>
                          )}
                        </div>
                      ))}
                      {day.activities.length === 0 &&
                        (isOwner || currentUserRole === "co-organizer") && (
                          <button
                            onClick={() =>
                              handleAddActivity(dayIndex, "after", -1)
                            }
                            className="w-full text-gray-500 hover:text-blue-400 hover:bg-gray-800/50 text-sm py-3 rounded-xl transition border border-dashed border-gray-700 hover:border-blue-500/30"
                          >
                            + Agregar actividad
                          </button>
                        )}
                    </div>

                    {day.accommodation ? (
                      <div className="border-t border-gray-800 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-gray-400 text-sm flex gap-2 items-center">
                            <House /> Alojamiento
                          </p>
                          {(isOwner || currentUserRole === "co-organizer") && (
                            <button
                              onClick={() =>
                                setEditingAccommodation(
                                  editingAccommodation === dayIndex
                                    ? null
                                    : dayIndex,
                                )
                              }
                              className="text-gray-600 hover:text-blue-400 items-center flex gap-2 transition"
                            >
                              {editingAccommodation === dayIndex ? (
                                <>
                                  Listo <CheckIcon />
                                </>
                              ) : (
                                <>
                                  Ingresar datos <EditIcon />
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {editingAccommodation === dayIndex ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={day.accommodation.suggestion}
                              onChange={(e) =>
                                handleUpdateAccommodation(
                                  dayIndex,
                                  "suggestion",
                                  e.target.value,
                                )
                              }
                              placeholder="Nombre del alojamiento"
                              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={day.accommodation.zone}
                              onChange={(e) =>
                                handleUpdateAccommodation(
                                  dayIndex,
                                  "zone",
                                  e.target.value,
                                )
                              }
                              placeholder="Zona / Colonia"
                              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {/* Monto + Moneda */}
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={day.accommodation.amount}
                                onChange={(e) =>
                                  handleUpdateAccommodation(
                                    dayIndex,
                                    "amount",
                                    Number(e.target.value),
                                  )
                                }
                                placeholder="Costo"
                                className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <select
                                value={
                                  day.accommodation.currency || userCurrency
                                }
                                onChange={(e) =>
                                  handleUpdateAccommodation(
                                    dayIndex,
                                    "currency",
                                    e.target.value,
                                  )
                                }
                                className="bg-gray-800 text-white rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {["MXN", "USD", "EUR", "GBP"].map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <input
                              type="text"
                              value={day.accommodation.accommodationLink}
                              onChange={(e) =>
                                handleUpdateAccommodation(
                                  dayIndex,
                                  "accommodationLink",
                                  e.target.value,
                                )
                              }
                              placeholder="Link de reserva (Airbnb, Booking, etc.)"
                              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => {
                                setEditingAccommodation(null);
                                if (
                                  day.accommodation?.amount &&
                                  day.accommodation.amount > 0
                                ) {
                                  setPendingAccommodationExpense({
                                    amount: day.accommodation.amount,
                                    currency: day.accommodation.currency,
                                    suggestion: day.accommodation.suggestion,
                                    date: day.date,
                                    trip_day: day.day,
                                  });
                                }
                              }}
                              className="text-blue-400 text-xs hover:underline border border-blue-400 px-3 py-1 rounded-full transition"
                            >
                              ✓ Listo
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold">
                              {day.accommodation.suggestion || "Sin nombre"}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {day.accommodation.zone &&
                                `Zona: ${day.accommodation.zone}`}
                              {day.accommodation.zone &&
                                day.accommodation.amount > 0 &&
                                " · "}
                              {day.accommodation.amount > 0 &&
                                `${day.accommodation.amount} ${day.accommodation.currency}`}
                            </p>
                            {day.accommodation.accommodationLink ? (
                              <a
                                href={day.accommodation.accommodationLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-sm mt-2 inline-block"
                              >
                                Ver reserva →
                              </a>
                            ) : (
                              <div className="flex gap-3 mt-2">
                                <a
                                  href={`https://www.airbnb.mx/s/${encodeURIComponent(day.destination)}/homes`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline text-sm"
                                >
                                  Buscar en Airbnb →
                                </a>
                                <a
                                  href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(day.destination)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline text-sm"
                                >
                                  Buscar en Booking →
                                </a>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      (isOwner || currentUserRole === "co-organizer") && (
                        <div className="border-t border-gray-800 pt-4">
                          <button
                            onClick={() => handleAddAccommodation(dayIndex)}
                            className="w-full text-gray-500 hover:text-blue-400 hover:bg-gray-800/50 text-sm py-3 rounded-xl transition border border-dashed border-gray-700 hover:border-blue-500/30"
                          >
                            + Agregar alojamiento
                          </button>
                        </div>
                      )
                    )}
                  </div>
                  {dayIndex === itinerary.days.length - 1 &&
                    (isOwner || currentUserRole === "co-organizer") && (
                      <button
                        onClick={() => handleAddDay("after", dayIndex)}
                        className="w-full text-gray-600 hover:text-blue-400 hover:bg-gray-800/50 text-xs py-2 rounded-xl transition border border-dashed border-transparent hover:border-gray-700 mt-2"
                      >
                        + Agregar día aquí
                      </button>
                    )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      {/* Botones flotantes */}
      <div className="fixed bottom-8 right-8 flex gap-3 z-30">
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
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full space-y-6">
            <div>
              <p className="text-xl font-bold mb-1 flex gap-2">
                <WarningIcon /> Antes de continuar
              </p>
              <p className="text-gray-400 text-sm">
                El itinerario se generará sin considerar a los viajeros que
                faltan.
              </p>
            </div>
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li key={i} className="text-yellow-400 text-sm flex gap-2">
                  <span>•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  handleGenerateItinerary();
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
              >
                Generar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
      {editingPrefs && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                <EditIcon /> Editar preferencias
              </h2>
              <button
                onClick={() => setEditingPrefs(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Presupuesto */}
            <div>
              <label className="text-white font-semibold mb-2 block">
                Presupuesto (MXN)
              </label>
              <input
                type="number"
                value={editForm.budget}
                onChange={(e) =>
                  setEditForm({ ...editForm, budget: Number(e.target.value) })
                }
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Comida */}
            <div>
              <label className="text-white font-semibold mb-2 block">
                Comida
              </label>
              <div className="flex flex-wrap gap-2">
                {FOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        foodPreferences: prev.foodPreferences.includes(opt)
                          ? prev.foodPreferences.filter((v) => v !== opt)
                          : [...prev.foodPreferences, opt],
                      }))
                    }
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      editForm.foodPreferences.includes(opt)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Actividades */}
            <div>
              <label className="text-white font-semibold mb-2 block">
                Actividades
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        activityPreferences: prev.activityPreferences.includes(
                          opt,
                        )
                          ? prev.activityPreferences.filter((v) => v !== opt)
                          : [...prev.activityPreferences, opt],
                      }))
                    }
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      editForm.activityPreferences.includes(opt)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Lugares de interés */}
            <div>
              <label className="text-white font-semibold mb-2 block">
                Lugares de interés
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={attractionInput}
                  onChange={(e) => setAttractionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && attractionInput.trim()) {
                      setEditForm((prev) => ({
                        ...prev,
                        attractionsPreferences: [
                          ...prev.attractionsPreferences,
                          attractionInput.trim(),
                        ],
                      }));
                      setAttractionInput("");
                    }
                  }}
                  placeholder="Ej: Chichén Itzá"
                  className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (!attractionInput.trim()) return;
                    setEditForm((prev) => ({
                      ...prev,
                      attractionsPreferences: [
                        ...prev.attractionsPreferences,
                        attractionInput.trim(),
                      ],
                    }));
                    setAttractionInput("");
                  }}
                  disabled={!attractionInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  ✓ Confirmar
                </button>
              </div>
              {editForm.attractionsPreferences.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {editForm.attractionsPreferences.map((a, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full"
                    >
                      <PinIcon /> {a}
                      <button
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            attractionsPreferences:
                              prev.attractionsPreferences.filter(
                                (_, idx) => idx !== i,
                              ),
                          }))
                        }
                        className="text-gray-500 hover:text-red-400 transition ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ritmo */}
            <div>
              <label className="text-white font-semibold mb-2 block">
                Ritmo de viaje
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        travelPace: opt.value as
                          | "relaxed"
                          | "moderate"
                          | "intense",
                      })
                    }
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      editForm.travelPace === opt.value
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <p>{opt.icon}</p>
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-gray-400 text-xs">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingPrefs(false)}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrefs}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50 transition">
          <CheckIcon /> {toastMessage}
        </div>
      )}
    </div>
  );
}

export default TripDetail;
