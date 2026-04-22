import { useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  Trip,
  GeneratedItinerary,
  ItineraryActivity,
} from "../../types/trip.types";
import CalendarIcon from "../Icons/CalendarIcon";
import WarningIcon from "../Icons/WarningIcon";
import EditIcon from "../Icons/EditIcon";
import TrashIcon from "../Icons/TrashIcon";
import House from "../Icons/House";
import CheckIcon from "../Icons/CheckIcon";

interface PendingAccommodationExpense {
  amount: number;
  currency: string;
  suggestion: string;
  date: string;
  trip_day: number;
}

interface Props {
  trip: Trip;
  itinerary: GeneratedItinerary;
  isOwner: boolean;
  currentUserRole: string | null;
  userCurrency: string;
  onItineraryChange: (itinerary: GeneratedItinerary) => void;
  onPendingAccommodationExpense: (expense: PendingAccommodationExpense) => void;
}

export function ItinerarySection({
  trip,
  itinerary,
  isOwner,
  currentUserRole,
  userCurrency,
  onItineraryChange,
  onPendingAccommodationExpense,
}: Props) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [editingActivity, setEditingActivity] = useState<{
    dayIndex: number;
    activityIndex: number;
  } | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<
    number | null
  >(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const formatDate = (dateStr: string) => {
    const s = new Date(dateStr + "T00:00:00").toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const handleUpdateActivity = async (
    dayIndex: number,
    activityIndex: number,
    field: keyof Pick<
      ItineraryActivity,
      "title" | "description" | "time_start" | "time_end" | "location"
    >,
    value: string,
  ) => {
    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex].activities[activityIndex] = {
      ...updatedDays[dayIndex].activities[activityIndex],
      [field]: value,
    };

    onItineraryChange({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day_number);
  };

  const handleUpdateActivityCost = async (
    dayIndex: number,
    activityIndex: number,
    field: "min" | "max",
    value: number,
  ) => {
    const updatedDays = [...itinerary.days];
    const current = updatedDays[dayIndex].activities[activityIndex];
    updatedDays[dayIndex].activities[activityIndex] = {
      ...current,
      estimated_cost: {
        ...current.estimated_cost,
        [field]: value,
      },
    };

    onItineraryChange({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day_number);
  };

  const handleAddActivity = async (
    dayIndex: number,
    position: "before" | "after",
    activityIndex: number,
  ) => {
    const newActivity: ItineraryActivity = {
      id: `manual-${Date.now()}`,
      time_start: "12:00",
      time_end: "13:00",
      title: "Nueva actividad",
      description: "Descripción de la actividad",
      estimated_cost: { min: 0, max: 0 },
      location: "",
      type: "actividad",
      full_day: false,
    };

    const updatedDays = [...itinerary.days];
    const activities = [...updatedDays[dayIndex].activities];

    const insertAt =
      activities.length === 0 || activityIndex === -1
        ? 0
        : position === "before"
          ? activityIndex
          : activityIndex + 1;

    activities.splice(insertAt, 0, newActivity);
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], activities };

    onItineraryChange({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day_number);

    setEditingActivity({ dayIndex, activityIndex: insertAt });
  };

  const handleDeleteActivity = async (
    dayIndex: number,
    activityIndex: number,
  ) => {
    if (!confirm("¿Seguro que quieres eliminar esta actividad?")) return;

    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex].activities = updatedDays[dayIndex].activities.filter(
      (_, i) => i !== activityIndex,
    );

    onItineraryChange({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day_number);
  };

  const handleUpdateDay = async (
    dayIndex: number,
    field: "destination" | "date",
    value: string,
  ) => {
    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      [field]: value,
    };

    onItineraryChange({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ [field]: value, activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day_number);
  };

  const handleDeleteDay = async (dayIndex: number) => {
    if (!confirm("¿Seguro que quieres eliminar este día?")) return;

    const updatedDays = itinerary.days
      .filter((_, i) => i !== dayIndex)
      .map((d, idx) => ({ ...d, day_number: idx + 1 }));

    onItineraryChange({ ...itinerary, days: updatedDays });
    setSelectedDayIndex((i) =>
      Math.min(i, Math.max(0, updatedDays.length - 1)),
    );

    await supabase.from("itinerary_days").delete().eq("trip_id", trip.id);
    if (updatedDays.length > 0) {
      await supabase.from("itinerary_days").insert(
        updatedDays.map((d) => ({
          trip_id: trip.id,
          day_number: d.day_number,
          date: d.date,
          destination: d.destination,
          activities: d,
        })),
      );
    }
  };

  const handleAddDay = async (
    position: "before" | "after",
    dayIndex: number,
  ) => {
    const referenceDay = itinerary.days[dayIndex];
    const referenceDate = new Date(referenceDay.date);

    const newDate = new Date(referenceDate);
    if (position === "before") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }

    const newDay = {
      day_number: 0,
      date: newDate.toISOString().split("T")[0],
      destination: referenceDay.destination,
      flags: [],
      activities: [],
      accommodation: {
        name: "",
        zone: "",
        amount: 0,
        currency: userCurrency,
        airbnb_url: null,
        booking_url: null,
      },
      day_summary: {
        total_hours: 0,
        total_cost_min: 0,
        total_cost_max: 0,
        activity_count: 0,
      },
    };

    const updatedDays = [...itinerary.days];
    const insertAt = position === "before" ? dayIndex : dayIndex + 1;
    updatedDays.splice(insertAt, 0, newDay);

    const renumbered = updatedDays.map((d, idx) => ({
      ...d,
      day_number: idx + 1,
    }));

    onItineraryChange({ ...itinerary, days: renumbered });
    if (position === "after") setSelectedDayIndex(dayIndex + 1);
    else setSelectedDayIndex(dayIndex);

    await supabase.from("itinerary_days").delete().eq("trip_id", trip.id);
    await supabase.from("itinerary_days").insert(
      renumbered.map((d) => ({
        trip_id: trip.id,
        day_number: d.day_number,
        date: d.date,
        destination: d.destination,
        activities: d,
      })),
    );
  };

  const handleUpdateAccommodation = async (
    dayIndex: number,
    field:
      | "name"
      | "zone"
      | "amount"
      | "currency"
      | "airbnb_url"
      | "booking_url",
    value: string | number,
  ) => {
    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      accommodation: {
        ...updatedDays[dayIndex].accommodation,
        [field]: value,
      },
    };
    onItineraryChange({ ...itinerary, days: updatedDays });
    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day_number);
  };

  const handleAddAccommodation = async (dayIndex: number) => {
    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      accommodation: {
        name: "",
        zone: "",
        amount: 0,
        currency: userCurrency,
        airbnb_url: null,
        booking_url: null,
      },
    };

    onItineraryChange({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day_number);

    setEditingAccommodation(dayIndex);
  };

  // Backward compat: old itineraries stored in Supabase use `time`, new ones use `time_start`
  const getTime = (activity: ItineraryActivity): string =>
    activity.time_start ??
    (activity as unknown as { time?: string }).time ??
    "";

  // Backward compat: old itineraries use `estimatedCost` string, new ones use `estimated_cost: { min, max }`
  const getCostDisplay = (activity: ItineraryActivity): string | null => {
    if (
      activity.estimated_cost &&
      (activity.estimated_cost.min > 0 || activity.estimated_cost.max > 0)
    ) {
      const { min, max } = activity.estimated_cost;
      const currency = trip.currency ?? "MXN";
      return min === max
        ? `${min.toLocaleString()} ${currency}`
        : `${min.toLocaleString()}–${max.toLocaleString()} ${currency}`;
    }
    const legacy = (activity as unknown as { estimatedCost?: string })
      .estimatedCost;
    return legacy ?? null;
  };

  const FLAG_LABELS: Record<string, string> = {
    día_pesado: "Día pesado",
    recomendado_dividir: "Considera dividir este día",
    sin_almuerzo: "Sin almuerzo planeado",
  };

  return (
    <section>
      <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <CalendarIcon /> Itinerario
      </h3>
      <p className="text-gray-400 mb-6">{itinerary.summary}</p>

      {/* Navegación horizontal de días */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {itinerary.days.map((day, i) => (
          <button
            key={day.day_number}
            onClick={() => setSelectedDayIndex(i)}
            className={
              i === selectedDayIndex
                ? "shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-600 text-white transition"
                : "shrink-0 px-4 py-1.5 rounded-full text-sm text-gray-400 border border-gray-700 hover:border-gray-500 transition"
            }
          >
            Día {day.day_number}
          </button>
        ))}
      </div>

      {/* Botones discretos de agregar día */}
      {(isOwner || currentUserRole === "co-organizer") && (
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleAddDay("before", 0)}
            className="text-xs text-gray-500 hover:text-blue-400 transition"
          >
            + Agregar día al inicio
          </button>
          <button
            onClick={() => handleAddDay("after", itinerary.days.length - 1)}
            className="text-xs text-gray-500 hover:text-blue-400 transition"
          >
            + Agregar día al final
          </button>
        </div>
      )}

      {/* Card del día seleccionado */}
      {itinerary.days.length > 0 &&
        (() => {
          const day = itinerary.days[selectedDayIndex];
          const dayIndex = selectedDayIndex;
          return (
            <div className="relative group/day">
              <div className="bg-gray-900 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                    Día {day.day_number}
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
                        {formatDate(day.date)}
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

                {/* Flags del día */}
                {day.flags && day.flags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {day.flags.map((flag) => (
                      <span
                        key={flag}
                        className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                      >
                        {FLAG_LABELS[flag] ?? flag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Resumen del día */}
                {day.day_summary &&
                  (day.day_summary.total_hours > 0 ||
                    day.day_summary.activity_count > 0) && (
                    <div className="flex gap-4 mb-4 text-xs text-gray-500">
                      <span>{day.day_summary.activity_count} actividades</span>
                      <span>{day.day_summary.total_hours}h planeadas</span>
                      {day.day_summary.total_cost_max > 0 && (
                        <span>
                          {day.day_summary.total_cost_min.toLocaleString()}–
                          {day.day_summary.total_cost_max.toLocaleString()}{" "}
                          {trip.currency ?? "MXN"}
                        </span>
                      )}
                    </div>
                  )}

                <div className="space-y-3 mb-4">
                  {day.activities.map((activity, i) => (
                    <div
                      key={activity.id ?? i}
                      className="relative group/activity"
                    >
                      {/* Buffer de traslado */}
                      {activity.type === "buffer" ? (
                        <div className="flex gap-4 py-1 opacity-50">
                          <span className="text-gray-600 text-xs w-12 shrink-0">
                            {getTime(activity)}
                          </span>
                          <div className="flex flex-col items-center">
                            <div className="w-px flex-1 border-l border-dashed border-gray-700" />
                          </div>
                          <span className="text-gray-600 text-xs italic self-center">
                            {activity.title}
                          </span>
                        </div>
                      ) : (
                        <>
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
                              {getTime(activity)}
                            </span>

                            <div className="flex flex-col items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-[#111121] z-10 shrink-0" />
                              {i < day.activities.length - 1 && (
                                <div className="w-px flex-1 bg-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              {editingActivity?.dayIndex === dayIndex &&
                              editingActivity?.activityIndex === i ? (
                                <div
                                  className="space-y-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <label className="text-xs text-gray-500 mb-1 block">
                                        Inicio
                                      </label>
                                      <input
                                        type="time"
                                        value={activity.time_start}
                                        onChange={(e) =>
                                          handleUpdateActivity(
                                            dayIndex,
                                            i,
                                            "time_start",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-xs text-gray-500 mb-1 block">
                                        Fin
                                      </label>
                                      <input
                                        type="time"
                                        value={activity.time_end}
                                        onChange={(e) =>
                                          handleUpdateActivity(
                                            dayIndex,
                                            i,
                                            "time_end",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>
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
                                    value={activity.location}
                                    onChange={(e) =>
                                      handleUpdateActivity(
                                        dayIndex,
                                        i,
                                        "location",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Ubicación"
                                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <div className="flex gap-2 items-center">
                                    <span className="text-xs text-gray-500 shrink-0">
                                      Costo ({trip.currency ?? "MXN"})
                                    </span>
                                    <input
                                      type="number"
                                      value={activity.estimated_cost?.min ?? 0}
                                      onChange={(e) =>
                                        handleUpdateActivityCost(
                                          dayIndex,
                                          i,
                                          "min",
                                          Number(e.target.value),
                                        )
                                      }
                                      placeholder="Mín"
                                      className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-600">–</span>
                                    <input
                                      type="number"
                                      value={activity.estimated_cost?.max ?? 0}
                                      onChange={(e) =>
                                        handleUpdateActivityCost(
                                          dayIndex,
                                          i,
                                          "max",
                                          Number(e.target.value),
                                        )
                                      }
                                      placeholder="Máx"
                                      className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
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
                                  {activity.location && (
                                    <p className="text-gray-600 text-xs mt-0.5">
                                      📍 {activity.location}
                                    </p>
                                  )}
                                  {getCostDisplay(activity) && (
                                    <p className="text-blue-400 text-xs mt-1">
                                      {getCostDisplay(activity)}
                                    </p>
                                  )}
                                  {activity.time_end && (
                                    <p className="text-gray-600 text-xs mt-0.5">
                                      Hasta las {activity.time_end}
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
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {day.accommodation &&
                (day.accommodation.name ||
                  isOwner ||
                  currentUserRole === "co-organizer") ? (
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
                          value={day.accommodation.name}
                          onChange={(e) =>
                            handleUpdateAccommodation(
                              dayIndex,
                              "name",
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
                            value={day.accommodation.currency || userCurrency}
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
                          value={day.accommodation.airbnb_url ?? ""}
                          onChange={(e) =>
                            handleUpdateAccommodation(
                              dayIndex,
                              "airbnb_url",
                              e.target.value,
                            )
                          }
                          placeholder="Link de Airbnb"
                          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={day.accommodation.booking_url ?? ""}
                          onChange={(e) =>
                            handleUpdateAccommodation(
                              dayIndex,
                              "booking_url",
                              e.target.value,
                            )
                          }
                          placeholder="Link de Booking"
                          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            setEditingAccommodation(null);
                            if (
                              day.accommodation?.amount &&
                              day.accommodation.amount > 0
                            ) {
                              onPendingAccommodationExpense({
                                amount: day.accommodation.amount,
                                currency: day.accommodation.currency,
                                suggestion: day.accommodation.name,
                                date: day.date,
                                trip_day: day.day_number,
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
                          {day.accommodation.name || "Sin nombre"}
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
                        {day.accommodation.airbnb_url ||
                        day.accommodation.booking_url ? (
                          <div className="flex gap-3 mt-2">
                            {day.accommodation.airbnb_url && (
                              <a
                                href={day.accommodation.airbnb_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-sm"
                              >
                                Ver en Airbnb →
                              </a>
                            )}
                            {day.accommodation.booking_url && (
                              <a
                                href={day.accommodation.booking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-sm"
                              >
                                Ver en Booking →
                              </a>
                            )}
                          </div>
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
            </div>
          );
        })()}
    </section>
  );
}
