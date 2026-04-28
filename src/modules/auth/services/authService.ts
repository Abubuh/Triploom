import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "../types/auth.types";
export async function signIn(payload: LoginPayload): Promise<AuthResponse> {
  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });
  return { data: null, error: error?.message ?? null };
}

export async function signUp(payload: RegisterPayload): Promise<AuthResponse> {
  const { error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        name: payload.name,
        currency: payload.currency,
      },
    },
  });

  if (error) return { data: null, error: error.message };

  return { data: null, error: null };
}

export async function signInWithGoogle(): Promise<AuthResponse> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  return { data: null, error: error?.message ?? null };
}

export async function signOut(): Promise<AuthResponse> {
  const { error } = await supabase.auth.signOut();
  return { data: null, error: error?.message ?? null };
}

export async function resetPasswordForEmail(
  email: string,
): Promise<AuthResponse> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data: null, error: error?.message ?? null };
}

export async function updatePassword(password: string): Promise<AuthResponse> {
  const { error } = await supabase.auth.updateUser({ password });
  return { data: null, error: error?.message ?? null };
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): { unsubscribe: () => void } {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return { unsubscribe: () => subscription.unsubscribe() };
}
