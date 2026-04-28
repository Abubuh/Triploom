import { useState } from "react";
import * as authService from "../services/authService";
import { validateEmail, validatePasswordLength, validatePasswordMatch } from "../utils/authValidation";

export function useResetPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const sendResetEmail = async (email: string): Promise<boolean> => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return false;
    }
    setError(null);
    const { error } = await authService.resetPasswordForEmail(email);
    if (error) {
      setError(error);
      return false;
    }
    setResetSent(true);
    return true;
  };

  const updatePassword = async (
    password: string,
    confirm: string,
  ): Promise<boolean> => {
    const matchError = validatePasswordMatch(password, confirm);
    if (matchError) { setError(matchError); return false; }
    const lengthError = validatePasswordLength(password);
    if (lengthError) { setError(lengthError); return false; }

    setLoading(true);
    setError(null);
    const { error } = await authService.updatePassword(password);
    setLoading(false);
    if (error) {
      setError(error);
      return false;
    }
    return true;
  };

  const clearError = () => setError(null);

  return { sendResetEmail, updatePassword, loading, error, resetSent, clearError };
}
