import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Expense } from "../types/trip.types";

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, [tripId]);

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("trip_id", tripId)
      .order("date", { ascending: true });

    if (data) setExpenses(data);
    setLoading(false);
  };

  // Agrupa gastos por fecha exacta del gasto
  const expensesByDate = expenses.reduce(
    (acc, e) => {
      const key = e.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    },
    {} as Record<string, Expense[]>,
  );

  const addExpense = async (
    expense: Omit<Expense, "id" | "created_at" | "user_id">,
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("expenses")
      .insert({ ...expense, user_id: user.id })
      .select()
      .single();

    if (!error && data) setExpenses((prev) => [...prev, data]);
  };

  const deleteExpense = async (expenseId: string) => {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (!error) setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  };

  // Total gastado por moneda
  const totalsByCurrency = expenses.reduce(
    (acc, e) => {
      acc[e.currency] = (acc[e.currency] || 0) + Number(e.amount);
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    expenses,
    expensesByDate,
    loading,
    addExpense,
    deleteExpense,
    totalsByCurrency,
  };
}
