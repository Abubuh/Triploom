import { useEffect, useState } from "react";
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

const CURRENCIES = ["MXN", "USD", "EUR", "GBP", "CAD", "ARS", "COP", "CLP"];

interface InlineFormState {
  amount: string;
  currency: string;
  category: ExpenseCategory;
  description: string;
}

interface PendingAccommodationExpense {
  amount: number;
  currency: string;
  suggestion: string;
  date: string;
  trip_day: number;
}

interface Props {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  itineraryDays: ItineraryDay[];
  myBudget: number | null;
  userCurrency: string;
  pendingAccommodationExpense: PendingAccommodationExpense | null;
  onAccommodationExpenseDone: () => void;
}

export function ExpenseDrawer({
  trip,
  isOpen,
  onClose,
  itineraryDays,
  myBudget,
  userCurrency,
  pendingAccommodationExpense,
  onAccommodationExpenseDone,
}: Props) {
  const {
    expenses,
    expensesByDate,
    loading,
    addExpense,
    deleteExpense,
    totalsByCurrency,
  } = useExpenses(trip.id);
  const [activeFormDate, setActiveFormDate] = useState<string | null>(null);
  const [form, setForm] = useState<InlineFormState>({
    amount: "",
    currency: userCurrency,
    category: "otro",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const today = new Date();
  const endDate = new Date(trip.end_date);
  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );

  useEffect(() => {
    setForm((prev) => ({ ...prev, currency: userCurrency }));
  }, [userCurrency]);

  const categoryInfo = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat) ?? { emoji: "📦", label: cat };

  const handleOpenForm = (date: string) => {
    setActiveFormDate(date);
    setForm({
      amount: "",
      currency: userCurrency,
      category: "otro",
      description: "",
    });
  };

  const handleCloseForm = () => setActiveFormDate(null);

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

  const spent = totalsByCurrency[userCurrency] ?? 0;
  const remaining = (myBudget ?? 0) - spent;
  const overBudget = remaining < 0;
  const progressPct = myBudget ? Math.min((spent / myBudget) * 100, 100) : 0;

  return (
    <>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-card border-l border-border-base dark:border-[#4a6b57] z-50 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-base dark:border-[#4a6b57] shrink-0">
              <div>
                <h2 className="text-lg flex gap-2 items-center font-bold mb-2 text-brand-mid-dark">
                  <CoinIcon /> Gastos
                </h2>
                <p className="text-brand-mid">{trip.name}</p>
              </div>
              <button
                onClick={onClose}
                className="text-text-faint hover:text-text-base transition text-xl"
              >
                ✕
              </button>
            </div>

            {/* Totales */}
            <div className="px-6 py-4 border-b border-border-base dark:border-[#4a6b57] shrink-0 space-y-3">
              {myBudget && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-brand-mid-dark text-sm">Presupuesto</p>
                    <p className="text-text-base font-bold text-lg dark:text-text-faint ">
                      {myBudget.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {userCurrency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-brand-mid-dark text-sm">Gastado</p>
                    <p className="font-bold text-lg text-red-400">
                      {spent.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {userCurrency}
                    </p>
                  </div>
                </div>
              )}

              {/* Barra de progreso */}
              {myBudget && (
                <div className="w-full bg-surface-subtle rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${overBudget ? "bg-red-500" : "bg-ready"}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {myBudget && (
                <div className="flex items-center justify-between">
                  <p className="text-brand-mid-dark text-sm">Restante</p>
                  <p
                    className={`font-semibold text-sm ${overBudget ? "text-red-400" : "text-ready"}`}
                  >
                    {remaining.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {userCurrency}
                  </p>
                </div>
              )}

              {/* Otras monedas */}
              {Object.entries(totalsByCurrency)
                .filter(([currency]) => currency !== userCurrency)
                .map(([currency, total]) => (
                  <div key={currency}>
                    <p className="text-text-faint dark:text-brand-subtle text-sm">
                      {currency} gastado
                    </p>
                    <p className="text-text-base font-semibold">
                      {total.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                ))}

              {daysLeft > 0 && myBudget && (
                <p className="text-brand-mid text-sm">
                  ~
                  {(remaining / daysLeft).toLocaleString("es-MX", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  {`${userCurrency}/día restante`}
                </p>
              )}
            </div>

            {/* Lista de días */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {loading ? (
                <p className="text-text-faint text-sm">Cargando gastos...</p>
              ) : itineraryDays.length === 0 ? (
                <p className="text-text-faint text-sm text-center mt-8">
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
                    <div key={day.day_number}>
                      {/* Header del día */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-sm font-bold text-brand- dark:text-brand-subtle uppercase tracking-wide">
                            Día {day.day_number}
                          </span>
                          <span className="text-text-base dark:text-brand-subtle text-sm ml-2">
                            {day.date}
                          </span>
                          <p className="text-text-base text-sm font-semibold dark:text-text-faint ">
                            {day.destination}
                          </p>
                        </div>
                        {dayTotal > 0 && (
                          <p className="text-text-base dark:text-brand-subtle text-sm ">
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
                                className="flex items-center gap-3 bg-surface-subtle border border-border-base dark:border-[#4a6b57] rounded-xl px-4 py-3 group"
                              >
                                <span className="text-lg dark:text-brand-subtle">
                                  {cat.emoji}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium dark:text-brand-subtle text-text-base truncate">
                                    {expense.description}
                                  </p>
                                  <p className="text-text-faint dark:text-text-faint text-sm">
                                    {cat.label}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-text-base font-semibold text-sm dark:text-brand-subtle">
                                    {Number(expense.amount).toLocaleString(
                                      "es-MX",
                                      { minimumFractionDigits: 2 },
                                    )}
                                  </p>
                                  <p className="text-text-faint text-xs">
                                    {expense.currency}
                                  </p>
                                </div>
                                <button
                                  onClick={() => deleteExpense(expense.id)}
                                  className="text-text-faint hover:text-red-400 transition opacity-0 group-hover:opacity-100 ml-1"
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
                        <div className="bg-surface-subtle border border-border-base dark:border-[#4a6b57] rounded-xl p-4 space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="0.00"
                              value={form.amount}
                              onChange={(e) =>
                                setForm({ ...form, amount: e.target.value })
                              }
                              className="flex-1 input-base"
                              autoFocus
                            />
                            <select
                              value={form.currency}
                              onChange={(e) =>
                                setForm({ ...form, currency: e.target.value })
                              }
                              className="input-base w-auto"
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            placeholder="¿En qué gastaste?"
                            value={form.description}
                            onChange={(e) =>
                              setForm({ ...form, description: e.target.value })
                            }
                            className="input-base"
                          />
                          <div className="flex gap-1 flex-wrap">
                            {CATEGORIES.map((cat) => (
                              <button
                                key={cat.value}
                                onClick={() =>
                                  setForm({ ...form, category: cat.value })
                                }
                                className={`text-xs px-2 py-1 flex gap-2 items-center mb-1 mr-1 rounded-full transition dark:text-brand-subtle ${
                                  form.category === cat.value
                                    ? "bg-brand-dark text-brand-light"
                                    : "bg-surface-card border border-border-base text-text-muted  hover:border-brand-mid"
                                }`}
                              >
                                {cat.emoji} {cat.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleCloseForm}
                              className="text-text-muted hover:text-text-base text-sm transition px-3 py-2"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() =>
                                handleSubmit(day.date, day.day_number)
                              }
                              disabled={
                                submitting || !form.amount || !form.description
                              }
                              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                            >
                              {submitting ? "..." : "Agregar"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenForm(day.date)}
                          className="w-full text-text-faint hover:text-brand-mid hover:bg-surface-subtle text-sm py-2 rounded-xl transition border border-dashed border-border-base hover:border-brand-mid/40"
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
      )}

      {/* Modal alojamiento pendiente */}
      {pendingAccommodationExpense && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-surface-card border border-border-base dark:border-[#4a6b57] rounded-2xl p-8 max-w-sm w-full space-y-4">
            <p className="text-lg font-bold text-text-base">
              ¿Agregar a gastos?
            </p>
            <p className="text-text-muted text-sm">
              ¿Quieres registrar el alojamiento{" "}
              <span className="text-text-base font-semibold">
                {pendingAccommodationExpense.suggestion}
              </span>{" "}
              por{" "}
              <span className="text-text-base font-semibold">
                {pendingAccommodationExpense.amount}{" "}
                {pendingAccommodationExpense.currency}
              </span>{" "}
              en tu lista de gastos?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onAccommodationExpenseDone}
                className="btn-outline px-5 py-2 text-sm"
              >
                No
              </button>
              <button
                onClick={async () => {
                  await addExpense({
                    trip_id: trip.id,
                    amount: pendingAccommodationExpense.amount,
                    currency: pendingAccommodationExpense.currency,
                    category: "alojamiento",
                    description:
                      pendingAccommodationExpense.suggestion || "Alojamiento",
                    date: pendingAccommodationExpense.date,
                    trip_day: pendingAccommodationExpense.trip_day,
                  });
                  onAccommodationExpenseDone();
                }}
                className="btn-primary px-5 py-2 text-sm"
              >
                Sí, agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
