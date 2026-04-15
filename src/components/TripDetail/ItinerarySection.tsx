import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Trip, GeneratedItinerary } from "../../types/trip.types";
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
  const [editingActivity, setEditingActivity] = useState<{
    dayIndex: number;
    activityIndex: number;
  } | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<
    number | null
  >(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const handleUpdateActivity = async (
    dayIndex: number,
    activityIndex: number,
    field: "title" | "description" | "time" | "estimatedCost",
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
      .eq("day_number", updatedDays[dayIndex].day);
  };

  const handleAddActivity = async (
    dayIndex: number,
    position: "before" | "after",
    activityIndex: number,
  ) => {
    const newActivity = {
      time: "12:00",
      title: "Nueva actividad",
      description: "Descripción de la actividad",
      type: "activity" as const,
      estimatedCost: "",
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
      .eq("day_number", updatedDays[dayIndex].day);

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
      .eq("day_number", updatedDays[dayIndex].day);
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
      .eq("day_number", updatedDays[dayIndex].day);
  };

  const handleDeleteDay = async (dayIndex: number) => {
    if (!confirm("¿Seguro que quieres eliminar este día?")) return;

    const updatedDays = itinerary.days
      .filter((_, i) => i !== dayIndex)
      .map((d, idx) => ({ ...d, day: idx + 1 }));

    onItineraryChange({ ...itinerary, days: updatedDays });

    await supabase.from("itinerary_days").delete().eq("trip_id", trip.id);
    if (updatedDays.length > 0) {
      await supabase.from("itinerary_days").insert(
        updatedDays.map((d) => ({
          trip_id: trip.id,
          day_number: d.day,
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
      day: 0,
      date: newDate.toISOString().split("T")[0],
      destination: referenceDay.destination,
      activities: [],
      accommodation: undefined,
    };

    const updatedDays = [...itinerary.days];
    const insertAt = position === "before" ? dayIndex : dayIndex + 1;
    updatedDays.splice(insertAt, 0, newDay);

    const renumbered = updatedDays.map((d, idx) => ({ ...d, day: idx + 1 }));

    onItineraryChange({ ...itinerary, days: renumbered });

    await supabase.from("itinerary_days").delete().eq("trip_id", trip.id);
    await supabase.from("itinerary_days").insert(
      renumbered.map((d) => ({
        trip_id: trip.id,
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
    const updatedDays = [...itinerary.days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      accommodation: {
        ...updatedDays[dayIndex].accommodation!,
        [field]: value,
      },
    };
    onItineraryChange({ ...itinerary, days: updatedDays });
    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day);
  };

  const handleAddAccommodation = async (dayIndex: number) => {
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

    onItineraryChange({ ...itinerary, days: updatedDays });

    await supabase
      .from("itinerary_days")
      .update({ activities: updatedDays[dayIndex] })
      .eq("trip_id", trip.id)
      .eq("day_number", updatedDays[dayIndex].day);

    setEditingAccommodation(dayIndex);
  };

  return (
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
                        handleUpdateDay(dayIndex, "destination", e.target.value)
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
                    <span className="text-gray-400 text-sm">{day.date}</span>
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
                      <div className="tl-spine">
                        <div className="tl-dot" />
                        <div className="tl-line" />{" "}
                      </div>
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
                      onClick={() => handleAddActivity(dayIndex, "after", -1)}
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
                            editingAccommodation === dayIndex ? null : dayIndex,
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
                            onPendingAccommodationExpense({
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
  );
}
