import { useState } from "react";
import * as authService from "../services/authService";
import type { LoginPayload } from "../types/auth.types";

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (payload: LoginPayload): Promise<boolean> => {
    setLoading(true);
    setError(null);
    const { error } = await authService.signIn(payload);
    setLoading(false);
    if (error) {
      setError(error);
      return false;
    }
    return true;
  };

  const loginWithGoogle = async (): Promise<void> => {
    setError(null);
    const { error } = await authService.signInWithGoogle();
    if (error) setError(error);
  };

  const clearError = () => setError(null);

  return { login, loginWithGoogle, loading, error, clearError };
}
