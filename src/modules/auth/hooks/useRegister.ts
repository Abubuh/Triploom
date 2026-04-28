import { useState } from "react";
import * as authService from "../services/authService";
import type { RegisterPayload } from "../types/auth.types";

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (payload: RegisterPayload): Promise<boolean> => {
    setLoading(true);
    setError(null);
    const { error } = await authService.signUp(payload);
    setLoading(false);
    if (error) {
      setError(error);
      return false;
    }
    return true;
  };

  const clearError = () => setError(null);

  return { register, loading, error, clearError };
}
