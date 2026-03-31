import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Trip, Destination, Member } from "../types/trip.types";
import { generateItinerary } from "../lib/claude";
import { GeneratedItinerary } from "../types/trip.types";
import { ExpenseDrawer } from "../components/ExpenseDrawer";
import { DocumentDrawer } from "../components/DocumentDrawer";
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

  const paceLabel = (pace: string) => {
    const map: Record<string, string> = {
      relaxed: "😌 Relajado",
      moderate: "🚶 Moderado",
      intense: "⚡ Intenso",
    };
    return map[pace] || pace;
  };

  const handleUpdateActivity = async (
    dayIndex: number,
    activityIndex: number,
    field: "title" | "description",
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
    alert("¡Link copiado! Compártelo con quien quieras invitar.");
  };

  const handleDownloadItinerary = () => {
    if (!itinerary || !trip) return;

    let content = `# ${trip.name}\n`;
    content += `📅 ${trip.start_date} → ${trip.end_date}\n\n`;

    if (itinerary.summary) {
      content += `## Resumen\n${itinerary.summary}\n\n`;
    }

    if (itinerary.budgetWarnings.length > 0) {
      content += `## ⚠️ Advertencias de presupuesto\n`;
      itinerary.budgetWarnings.forEach((w) => {
        content += `- ${w}\n`;
      });
      content += "\n";
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
        content += `💰 ${day.accommodation.estimatedCost}\n`;
        content += `Airbnb: ${day.accommodation.airbnbLink}\n`;
        content += `Booking: ${day.accommodation.bookingLink}\n`;
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
  const handleGenerateItinerary = async () => {
    if (!trip) return;
    setGenerating(true);
    try {
      const result = await generateItinerary({ trip, destinations, members });
      setItinerary(result);

      // Guardar en Supabase
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
          className="text-2xl font-bold cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          Triploom ✈️
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
            <span className="inline-block mt-2 bg-blue-500/10 text-blue-400 text-sm px-3 py-1 rounded-full">
              {trip.accommodation_type === "together"
                ? "🏠 Todos juntos"
                : "🏨 Por separado"}
            </span>
          </div>
          {isOwner && (
            <div className="flex gap-3">
              {itinerary && (
                <button
                  onClick={handleGenerateItinerary}
                  disabled={generating}
                  className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
                >
                  {generating ? "⏳ Generando..." : "🔄 Regenerar"}
                </button>
              )}
              {!itinerary && (
                <button
                  onClick={handleGenerateItinerary}
                  disabled={generating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
                >
                  {generating ? "⏳ Generando..." : "✨ Generar itinerario"}
                </button>
              )}
              {itinerary && (
                <button
                  onClick={handleDownloadItinerary}
                  className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-6 py-3 rounded-xl font-semibold transition"
                >
                  ⬇️ Descargar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Destinos */}
        <section>
          <h3 className="text-xl font-semibold mb-4">🗺️ Ruta</h3>
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
            <h3 className="text-xl font-semibold">👥 Viajeros</h3>
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
                    <p className="text-gray-400 text-sm">{m.profiles?.email}</p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      m.role === "owner"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : m.role === "co-organizer"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {m.role === "owner"
                      ? "👑 Owner"
                      : m.role === "co-organizer"
                        ? "🔧 Co-organizador"
                        : "✈️ Viajero"}
                  </span>
                </div>

                {m.member_preferences && (
                  <div className="space-y-3 border-t border-gray-800 pt-4">
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        {/* Itinerario */}
        {itinerary && (
          <section>
            <h3 className="text-xl font-semibold mb-2">📅 Itinerario</h3>
            <p className="text-gray-400 mb-6">{itinerary.summary}</p>

            {itinerary.budgetWarnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <p className="text-yellow-400 font-semibold mb-2">
                  ⚠️ Advertencias de presupuesto
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
                <div key={day.day} className="bg-gray-900 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                      Día {day.day}
                    </span>
                    <span className="text-gray-400 text-sm">{day.date}</span>
                    <span className="text-white font-semibold">
                      {day.destination}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    {day.activities.map((activity, i) => (
                      <div
                        key={i}
                        className="flex gap-4 group cursor-pointer"
                        onClick={() =>
                          setEditingActivity(
                            editingActivity?.dayIndex === dayIndex &&
                              editingActivity?.activityIndex === i
                              ? null
                              : { dayIndex, activityIndex: i },
                          )
                        }
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
                              <button
                                onClick={() => setEditingActivity(null)}
                                className="text-blue-400 text-xs hover:underline"
                              >
                                ✓ Listo
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="font-semibold text-sm group-hover:text-blue-400 transition">
                                {activity.title}
                                <span className="text-gray-600 text-xs ml-2 opacity-0 group-hover:opacity-100">
                                  ✏️ editar
                                </span>
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
                    ))}
                  </div>

                  {day.accommodation && (
                    <div className="border-t border-gray-800 pt-4">
                      <p className="text-gray-400 text-sm mb-2">
                        🏠 Alojamiento sugerido
                      </p>
                      <p className="font-semibold">
                        {day.accommodation.suggestion}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Zona: {day.accommodation.zone} ·{" "}
                        {day.accommodation.estimatedCost}
                      </p>
                      <div className="flex gap-3 mt-2">
                        <a
                          href={day.accommodation.airbnbLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm"
                        >
                          Buscar en Airbnb →
                        </a>
                        <a
                          href={day.accommodation.bookingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm"
                        >
                          Buscar en Booking →
                        </a>
                      </div>
                    </div>
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
          📄 Documentos
        </button>
        <button
          onClick={() => setExpenseDrawerOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg transition flex items-center gap-2"
        >
          💰 Gastos
        </button>
      </div>
      {trip && (
        <ExpenseDrawer
          trip={trip}
          isOpen={expenseDrawerOpen}
          onClose={() => setExpenseDrawerOpen(false)}
          itineraryDays={itinerary?.days ?? []}
          myBudget={myBudget}
        />
      )}
      {trip && (
        <DocumentDrawer
          trip={trip}
          isOpen={documentDrawerOpen}
          onClose={() => setDocumentDrawerOpen(false)}
        />
      )}
    </div>
  );
}

export default TripDetail;
