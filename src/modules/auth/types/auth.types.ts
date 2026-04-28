import type { Session, User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  name: string;
  email: string;
  currency: string;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export interface AuthResponse<T = void> {
  data: T | null;
  error: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  currency: string;
}
