import { supabase } from "../../../lib/supabase";
import type { AuthResponse, Profile } from "../types/auth.types";

export async function getProfile(userId: string): Promise<AuthResponse<Profile>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, currency")
    .eq("id", userId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Profile, error: null };
}

export async function updateProfileCurrency(
  userId: string,
  currency: string,
): Promise<AuthResponse> {
  const { error } = await supabase
    .from("profiles")
    .update({ currency })
    .eq("id", userId);
  return { data: null, error: error?.message ?? null };
}
