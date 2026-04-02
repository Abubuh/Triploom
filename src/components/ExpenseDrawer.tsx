import { Component, JSXElementConstructor, useState } from "react";
import { Trip, ExpenseCategory, ItineraryDay } from "../types/trip.types";
import { useExpenses } from "../hooks/useExpenses";
import CoinIcon from "./Icons/CoinIcon";
import FoodIcon from "./Icons/FoodIcon";
import TransportIcon from "./Icons/TransportIcon";
import House from "./Icons/House";
import TargetIcon from "./Icons/TargetIcon";
import ShopIcon from "./Icons/ShopIcon";
import BoxIcon from "./Icons/BoxIcon";

const CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  emoji: React.ReactNode;
}[] = [
  { value: "comida", label: "Comida", emoji: <FoodIcon /> },
  { value: "transporte", label: "Transporte", emoji: <TransportIcon /> },
  { value: "alojamiento", label: "Alojamiento", emoji: <House /> },
  { value: "actividades", label: "Actividades", emoji: <TargetIcon /> },
  { value: "compras", label: "Compras", emoji: <ShopIcon /> },
  { value: "otro", label: "Otro", emoji: <BoxIcon /> },
];

const CURRENCIES = ["MXN", "USD", "EUR", "GBP"];

interface InlineFormState {
  amount: string;
  currency: string;
  category: ExpenseCategory;
  description: string;
}

interface Props {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  itineraryDays: ItineraryDay[];
  myBudget: number | null;
}

export function ExpenseDrawer({
  trip,
  isOpen,
  onClose,
  itineraryDays,
  myBudget,
}: Props) {
  const {
    expenses,
    expensesByDate,
    loading,
    addExpense,
    deleteExpense,
    totalsByCurrency,
  } = useExpenses(trip.id);

  // Qué día tiene el formulario abierto (por fecha)
  const [activeFormDate, setActiveFormDate] = useState<string | null>(null);
  const [form, setForm] = useState<InlineFormState>({
    amount: "",
    currency: "MXN",
    category: "otro",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Días restantes
  const today = new Date();
  const endDate = new Date(trip.end_date);
  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const categoryInfo = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat) ?? { emoji: "📦", label: cat };

  const handleOpenForm = (date: string) => {
    setActiveFormDate(date);
    setForm({ amount: "", currency: "MXN", category: "otro", description: "" });
  };

  const handleCloseForm = () => {
    setActiveFormDate(null);
  };

  const handleSubmit = async (date: string, dayNumber: number) => {
    if (!form.amount || !form.description) return;
    setSubmitting(true);
    await addExpense({
      trip_id: trip.id,
      amount: parseFloat(form.amount),
      currency: form.currency,
      category: form.category,
      description: form.description,
      date,
      trip_day: dayNumber,
    });
    setActiveFormDate(null);
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg flex gap-2 items-center font-bold mb-2">
              <CoinIcon /> Gastos
            </h2>
            <p className="text-gray-400 text-sm">{trip.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-xl"
          >
            ✕
          </button>
        </div>

        {/* Totales */}
        <div className="px-6 py-4 border-b border-gray-800 shrink-0 space-y-3">
          {myBudget && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Presupuesto</p>
                <p className="text-white font-bold text-lg">
                  {myBudget.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  MXN
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">Gastado</p>
                <p className="font-bold text-lg text-red-400">
                  {(totalsByCurrency["MXN"] ?? 0).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  MXN
                </p>
              </div>
            </div>
          )}

          {/* Barra de progreso */}
          {myBudget && (
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  (totalsByCurrency["MXN"] ?? 0) > myBudget
                    ? "bg-red-500"
                    : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.min(((totalsByCurrency["MXN"] ?? 0) / myBudget) * 100, 100)}%`,
                }}
              />
            </div>
          )}

          {myBudget && (
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs">Restante</p>
              <p
                className={`font-semibold text-sm ${
                  myBudget - (totalsByCurrency["MXN"] ?? 0) < 0
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {(myBudget - (totalsByCurrency["MXN"] ?? 0)).toLocaleString(
                  "es-MX",
                  {
                    minimumFractionDigits: 2,
                  },
                )}{" "}
                MXN
              </p>
            </div>
          )}

          {/* Otras monedas */}
          {Object.entries(totalsByCurrency)
            .filter(([currency]) => currency !== "MXN")
            .map(([currency, total]) => (
              <div key={currency}>
                <p className="text-gray-400 text-xs">{currency} gastado</p>
                <p className="text-white font-semibold">
                  {total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}

          {daysLeft > 0 && myBudget && (
            <p className="text-blue-400 text-xs">
              ~
              {(
                (myBudget - (totalsByCurrency["MXN"] ?? 0)) /
                daysLeft
              ).toLocaleString("es-MX", { maximumFractionDigits: 0 })}{" "}
              MXN/día restante
            </p>
          )}
        </div>

        {/* Lista de días — scroll independiente */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <p className="text-gray-500 text-sm">Cargando gastos...</p>
          ) : itineraryDays.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-8">
              Genera el itinerario primero para agregar gastos
            </p>
          ) : (
            itineraryDays.map((day) => {
              const dayExpenses = expensesByDate[day.date] ?? [];
              const dayTotal = dayExpenses.reduce(
                (sum, e) => sum + Number(e.amount),
                0,
              );
              const isFormOpen = activeFormDate === day.date;

              return (
                <div key={day.day}>
                  {/* Header del día */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                        Día {day.day}
                      </span>
                      <span className="text-gray-400 text-xs ml-2">
                        {day.date}
                      </span>
                      <p className="text-white text-sm font-semibold">
                        {day.destination}
                      </p>
                    </div>
                    {dayTotal > 0 && (
                      <p className="text-gray-500 text-xs">
                        {dayTotal.toLocaleString("es-MX", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        MXN
                      </p>
                    )}
                  </div>

                  {/* Gastos del día */}
                  {dayExpenses.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {dayExpenses.map((expense) => {
                        const cat = categoryInfo(expense.category);
                        return (
                          <div
                            key={expense.id}
                            className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 group"
                          >
                            <span className="text-lg">{cat.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {expense.description}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {cat.label}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-white font-semibold text-sm">
                                {Number(expense.amount).toLocaleString(
                                  "es-MX",
                                  { minimumFractionDigits: 2 },
                                )}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {expense.currency}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteExpense(expense.id)}
                              className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Formulario inline */}
                  {isFormOpen ? (
                    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                      {/* Monto + Currency */}
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={form.amount}
                          onChange={(e) =>
                            setForm({ ...form, amount: e.target.value })
                          }
                          className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <select
                          value={form.currency}
                          onChange={(e) =>
                            setForm({ ...form, currency: e.target.value })
                          }
                          className="bg-gray-700 text-white rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Descripción */}
                      <input
                        type="text"
                        placeholder="¿En qué gastaste?"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* Categorías */}
                      <div className="flex gap-1 flex-wrap">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            onClick={() =>
                              setForm({ ...form, category: cat.value })
                            }
                            className={`text-xs px-2 py-1 flex gap-2 items-center mb-1 mr-1 rounded-full transition ${
                              form.category === cat.value
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                            }`}
                          >
                            {cat.emoji} {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Botones */}
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCloseForm}
                          className="text-gray-400 hover:text-white text-sm transition px-3 py-2"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSubmit(day.date, day.day)}
                          disabled={
                            submitting || !form.amount || !form.description
                          }
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                        >
                          {submitting ? "..." : "Agregar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenForm(day.date)}
                      className="w-full text-gray-500 hover:text-blue-400 hover:bg-gray-800 text-sm py-2 rounded-xl transition border border-dashed border-gray-800 hover:border-blue-500/30"
                    >
                      + Agregar gasto
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
