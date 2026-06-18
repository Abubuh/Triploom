import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Trip,
  GeneratedItinerary,
  ItineraryActivity,
  ItineraryDay,
} from "../../types/trip.types";
import CalendarIcon from "../Icons/CalendarIcon";
import EditIcon from "../Icons/EditIcon";
import TrashIcon from "../Icons/TrashIcon";
import House from "../Icons/House";
import CheckIcon from "../Icons/CheckIcon";
import PinIcon from "../Icons/PinIcon";

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

  useEffect(() => {
    if (selectedDayIndex >= itinerary.days.length) {
      setSelectedDayIndex(Math.max(0, itinerary.days.length - 1));
    }
  }, [itinerary.days.length]);
  const [editingActivity, setEditingActivity] = useState<{
    dayIndex: number;
    activityIndex: number;
  } | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<
    number | null
  >(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingBuffer, setEditingBuffer] = useState<{
    dayIndex: number;
    activityIndex: number;
  } | null>(null);

  const formatDate = (dateStr: string) => {
    const s = new Date(dateStr + "T00:00:00").toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const persistDay = async (day: ItineraryDay): Promise<void> => {
    const { error } = await supabase
      .from("itinerary_days")
      .update({ activities: day })
      .eq("trip_id", trip.id)
      .eq("day_number", day.day_number);
    if (error) console.error("No se pudo guardar el día:", error);
  };

  const handleDeleteBuffer = async (
    dayIndex: number,
    activityIndex: number,
  ) => {
    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      activities: updatedDays[dayIndex].activities.filter(
        (_, idx) => idx !== activityIndex,
      ),
    };
    onItineraryChange({ ...itinerary, days: updatedDays });
    await persistDay(updatedDays[dayIndex]);
  };

  const makeBuffer = (start: string, end: string): ItineraryActivity => ({
    id: `manual-buffer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time_start: start,
    time_end: end,
    title: "Traslado",
    estimated_cost: { min: 0, max: 0 },
    place: { name: "", address: "", search_query: "", lat: null, lng: null },
    type: "buffer",
    full_day: false,
  });

  const handleAddBuffer = async (dayIndex: number, activityIndex: number) => {
    const updatedDays = [...itinerary.days];
    const activities = [...updatedDays[dayIndex].activities];
    const prev = activities[activityIndex];
    const next = activities[activityIndex + 1];
    const start = prev?.time_end ?? "12:00";
    const end =
      next?.time_start && next.time_start >= start ? next.time_start : start;
    activities.splice(activityIndex + 1, 0, makeBuffer(start, end));
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], activities };
    onItineraryChange({ ...itinerary, days: updatedDays });
    await persistDay(updatedDays[dayIndex]);
  };

  const handleUpdateActivity = async (
    dayIndex: number,
    activityIndex: number,
    field: keyof Pick<
      ItineraryActivity,
      "title" | "time_start" | "time_end"
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
      estimated_cost: { ...current.estimated_cost, [field]: value },
    };
    onItineraryChange({ ...itinerary, days: updatedDays });
    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day_number);
  };

  const handleUpdateActivityPlace = async (
    dayIndex: number,
    activityIndex: number,
    value: string,
  ) => {
    const updatedDays = [...itinerary.days];
    const current = updatedDays[dayIndex].activities[activityIndex];
    updatedDays[dayIndex].activities[activityIndex] = {
      ...current,
      place: {
        ...current.place,
        name: value,
        search_query: `${value}, ${updatedDays[dayIndex].destination}`,
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
      estimated_cost: { min: 0, max: 0 },
      place: { name: "", address: "", search_query: "", lat: null, lng: null },
      type: "activity",
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
    await persistDay(updatedDays[dayIndex]);
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
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], [field]: value };
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
    const newDate = new Date(referenceDay.date);
    position === "before"
      ? newDate.setDate(newDate.getDate() - 1)
      : newDate.setDate(newDate.getDate() + 1);
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
    setSelectedDayIndex(position === "after" ? dayIndex + 1 : dayIndex);
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
      accommodation: { ...updatedDays[dayIndex].accommodation, [field]: value },
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

  const getTime = (activity: ItineraryActivity): string =>
    activity.time_start ??
    (activity as unknown as { time?: string }).time ??
    "";

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
    return (
      (activity as unknown as { estimatedCost?: string }).estimatedCost ?? null
    );
  };

  const FLAG_LABELS: Record<string, string> = {
    día_pesado: "Día pesado",
    recomendado_dividir: "Considera dividir este día",
    sin_almuerzo: "Sin almuerzo planeado",
  };

  const inputCls = "w-full input-base";
  const canbEdit = isOwner || currentUserRole === "co-organizer";

  return (
    <section>
      <h3 className="text-xl font-semibold mb-2 flex items-center gap-2 text-black">
        <CalendarIcon /> Itinerario
      </h3>
      <p className="text-text-muted mb-6">{itinerary.summary}</p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {itinerary.days.map((day, i) => (
          <button
            key={day.day_number}
            onClick={() => setSelectedDayIndex(i)}
            className={
              i === selectedDayIndex
                ? "shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold bg-brand-dark text-brand-light transition"
                : "shrink-0 px-4 py-1.5 rounded-full text-sm text-text-muted border border-border-base dark:border-[#4a6b57] hover:border-brand-mid transition"
            }
          >
            Día {day.day_number}
          </button>
        ))}
      </div>

      
      {canbEdit && (
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleAddDay("before", 0)}
            className="text-xs text-text-faint hover:text-brand-mid transition"
          >
            + Agregar día al inicio
          </button>
          <button
            onClick={() => handleAddDay("after", itinerary.days.length - 1)}
            className="text-xs text-text-faint hover:text-brand-mid transition"
          >
            + Agregar día al final
          </button>
        </div>
      )}

      
      {itinerary.days.length > 0 &&
        (() => {
          const dayIndex = Math.min(selectedDayIndex, itinerary.days.length - 1);
          const day = itinerary.days[dayIndex];
          return (
            <div className="relative group/day">
              <div className="bg-surface-card border border-border-base dark:border-[#4a6b57] rounded-2xl p-6">
                
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="bg-brand-dark text-brand-light text-sm font-bold px-3 py-1 rounded-full">
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
                        className="input-base w-auto"
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
                        className="input-base flex-1"
                        placeholder="Destino"
                      />
                      <button
                        onClick={() => setEditingDay(null)}
                        className="text-brand-mid text-xs hover:underline shrink-0"
                      >
                        ✓ Listo
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-brand-dark text-sm ">
                        {formatDate(day.date)}
                      </span>
                      <span className="text-brand-mid font-semibold ">
                        {day.destination}
                      </span>
                      {canbEdit && (
                        <button
                          onClick={() => setEditingDay(dayIndex)}
                          className="text-text-faint hover:text-plan text-xs transition"
                        >
                          <EditIcon />
                        </button>
                      )}
                      {canbEdit && (
                        <button
                          onClick={() => handleDeleteDay(dayIndex)}
                          className="text-text-faint hover:text-red-400 text-xs transition"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {day.flags && day.flags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {day.flags.map((flag) => (
                      <span
                        key={flag}
                        className="text-xs px-2 py-0.5 rounded-full bg-plan/15 text-plan border border-plan/20"
                      >
                        {FLAG_LABELS[flag] ?? flag}
                      </span>
                    ))}
                  </div>
                )}
                {day.day_summary &&
                  (day.day_summary.total_hours > 0 ||
                    day.day_summary.activity_count > 0) && (
                    <div className="flex gap-4 mb-4 text-xs text-text-muted dark:text-text-faint">
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
                      {activity.type === "buffer" ? (
                        <div className="flex gap-4 py-1 group/buffer items-center">
                          <span className="text-text-faint text-sm w-12 shrink-0 opacity-50">
                            {getTime(activity)}
                          </span>
                          <div className="flex flex-col items-center self-stretch">
                            <div className="w-px flex-1 border-l border-dashed border-border-base opacity-50" />
                          </div>
                          {editingBuffer?.dayIndex === dayIndex &&
                          editingBuffer?.activityIndex === i ? (
                            <div
                              className="flex items-center gap-2 flex-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-text-muted dark:text-text-faint text-sm italic">
                                {activity.title}
                              </span>
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
                                className="input-base w-auto"
                              />
                              <span className="text-text-faint">–</span>
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
                                className="input-base w-auto"
                              />
                              <button
                                onClick={() => setEditingBuffer(null)}
                                className="text-brand-mid text-xs hover:underline"
                              >
                                Listo
                              </button>
                            </div>
                          ) : (
                            <span className="text-text-muted dark:text-text-faint text-sm italic self-center flex items-center gap-2">
                              {activity.title}
                              {canbEdit && (
                                <span className="opacity-0 group-hover/buffer:opacity-100 transition flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setEditingBuffer({
                                        dayIndex,
                                        activityIndex: i,
                                      })
                                    }
                                    className="text-text-faint hover:text-plan transition"
                                  >
                                    <EditIcon />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteBuffer(dayIndex, i)
                                    }
                                    className="text-text-faint hover:text-red-400 transition"
                                  >
                                    <TrashIcon />
                                  </button>
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          
                          {canbEdit && (
                            <div className="flex items-center gap-2 opacity-0 group-hover/activity:opacity-100 transition my-1">
                              <div className="flex-1 h-px bg-border-base" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddActivity(dayIndex, "before", i);
                                }}
                                className="text-text-faint hover:text-brand-mid hover:bg-surface-subtle text-xs px-3 py-0.5 rounded-full transition shrink-0"
                              >
                                + Agregar antes
                              </button>
                              <div className="flex-1 h-px bg-border-base" />
                            </div>
                          )}

                          <div className="flex gap-4 group">
                            <span className="text-text-faint text-sm w-12 shrink-0">
                              {getTime(activity)}
                            </span>
                            <div className="flex flex-col items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-brand-mid border-2 border-surface-card z-10 shrink-0" />
                              {i < day.activities.length - 1 && (
                                <div className="w-px flex-1 bg-border-base" />
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
                                      <label className="text-xs text-text-faint mb-1 block">
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
                                        className={inputCls}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-xs text-text-faint mb-1 block">
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
                                        className={inputCls}
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
                                    className={inputCls}
                                  />
                                  <input
                                    type="text"
                                    value={activity.place?.name ?? ""}
                                    onChange={(e) =>
                                      handleUpdateActivityPlace(
                                        dayIndex,
                                        i,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Lugar / Dirección"
                                    className={inputCls}
                                  />
                                  <div className="flex gap-2 items-center">
                                    <span className="text-xs text-text-faint shrink-0">
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
                                      className="flex-1 input-base"
                                    />
                                    <span className="text-text-faint">–</span>
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
                                      className="flex-1 input-base"
                                    />
                                  </div>
                                  <button
                                    onClick={() => setEditingActivity(null)}
                                    className="text-brand-mid text-xs hover:underline border border-brand-mid px-3 py-1 rounded-full transition"
                                  >
                                    ✓ Listo
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="font-semibold text-brand-mid group-hover:text-brand-mid transition flex gap-2 items-center">
                                    {activity.title}
                                    {canbEdit && (
                                      <button
                                        onClick={() =>
                                          setEditingActivity(
                                            editingActivity?.dayIndex ===
                                              dayIndex &&
                                              editingActivity?.activityIndex ===
                                                i
                                              ? null
                                              : { dayIndex, activityIndex: i },
                                          )
                                        }
                                        className="text-text-faint hover:text-plan text-xs ml-2 opacity-0 group-hover:opacity-100 flex gap-1 items-center transition"
                                      >
                                        Editar <EditIcon />
                                      </button>
                                    )}
                                    {canbEdit && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteActivity(dayIndex, i);
                                        }}
                                        className="text-text-faint hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 flex gap-1 items-center transition"
                                      >
                                        Eliminar <TrashIcon />
                                      </button>
                                    )}
                                  </p>
                                  {activity.place?.name &&
                                    (activity.place.search_query ? (
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place.search_query)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-text-muted dark:text-text-faint hover:text-brand-mid  mt-0.5 flex items-center gap-1 transition w-fit"
                                      >
                                        <PinIcon /> {activity.place.name}
                                      </a>
                                    ) : (
                                      <p className="text-text-faint text-xs mt-0.5">
                                        <PinIcon /> {activity.place.name}
                                      </p>
                                    ))}
                                  {activity.flagged && (
                                    <p className="text-amber-500 text-xs mt-1">
                                      Este lugar podría estar fuera del destino. Verifica antes de visitarlo.
                                    </p>
                                  )}
                                  {getCostDisplay(activity) && (
                                    <p className="text-brand-mid text-sm mt-1">
                                      {getCostDisplay(activity)}
                                    </p>
                                  )}
                                  {activity.time_end && (
                                    <p className="text-brand-mid dark:text-text-faint text-sm mt-0.5">
                                      Hasta las {activity.time_end}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          
                          {canbEdit && (
                            <div className="flex items-center gap-2 opacity-0 group-hover/activity:opacity-100 transition my-1">
                              <div className="flex-1 h-px bg-border-base" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddActivity(dayIndex, "after", i);
                                }}
                                className="text-text-faint hover:text-brand-mid hover:bg-surface-subtle text-xs px-3 py-0.5 rounded-full transition shrink-0"
                              >
                                + Agregar después
                              </button>
                              <div className="flex-1 h-px bg-border-base" />
                            </div>
                          )}

                          {/* Agregar traslado: solo si el siguiente es otra actividad (no hay traslado ya) */}
                          {canbEdit &&
                            day.activities[i + 1] &&
                            day.activities[i + 1].type !== "buffer" && (
                              <div className="flex items-center gap-2 my-1">
                                <div className="flex-1 border-t border-dashed border-border-base" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddBuffer(dayIndex, i);
                                  }}
                                  className="text-text-faint hover:text-brand-mid text-xs px-2 py-0.5 rounded-full transition shrink-0"
                                >
                                  + Agregar traslado
                                </button>
                                <div className="flex-1 border-t border-dashed border-border-base" />
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  ))}
                </div>

                
                {day.accommodation && (day.accommodation.name || canbEdit) ? (
                  <div className="border-t border-border-base pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-text-muted dark:text-brand-subtle text-sm flex gap-2 items-center">
                        <House /> Alojamiento
                      </p>
                      {canbEdit && (
                        <button
                          onClick={() =>
                            setEditingAccommodation(
                              editingAccommodation === dayIndex
                                ? null
                                : dayIndex,
                            )
                          }
                          className="text-text-faint hover:text-brand-mid items-center flex gap-2 transition text-sm"
                        >
                          {editingAccommodation === dayIndex ? (
                            <>
                              <span>Listo</span> <CheckIcon />
                            </>
                          ) : (
                            <>
                              <span>Ingresar datos</span> <EditIcon />
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
                          className={inputCls}
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
                          className={inputCls}
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
                            className="flex-1 input-base"
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
                            className="input-base w-auto"
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
                          className={inputCls}
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
                          className={inputCls}
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
                          className="text-brand-mid text-xs hover:underline border border-brand-mid px-3 py-1 rounded-full transition"
                        >
                          ✓ Listo
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold text-text-base dark:text-brand-subtle ">
                          {day.accommodation.name || "Sin nombre"}
                        </p>
                        <p className="text-text-muted dark:text-text-faint text-sm">
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
                                className="text-brand-mid hover:underline text-sm"
                              >
                                Ver en Airbnb →
                              </a>
                            )}
                            {day.accommodation.booking_url && (
                              <a
                                href={day.accommodation.booking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-mid hover:underline text-sm"
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
                              className="text-brand-mid hover:underline text-sm"
                            >
                              Buscar en Airbnb →
                            </a>
                            <a
                              href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(day.destination)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-mid hover:underline text-sm"
                            >
                              Buscar en Booking →
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  canbEdit && (
                    <div className="border-t border-border-base pt-4">
                      <button
                        onClick={() => handleAddAccommodation(dayIndex)}
                        className="w-full text-text-faint hover:text-brand-mid hover:bg-surface-subtle text-sm py-3 rounded-xl transition border border-dashed border-border-base hover:border-brand-mid/30"
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
