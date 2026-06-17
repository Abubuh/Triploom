import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import { useResetPassword } from "../hooks/useResetPassword";

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({
  onSwitchToRegister: _onSwitchToRegister,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {
    login,
    loginWithGoogle: _loginWithGoogle,
    loading,
    error,
    clearError,
  } = useLogin();
  const { sendResetEmail, resetSent, error: resetError } = useResetPassword();

  const combinedError = error ?? resetError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login({ email, password });
  };

  const handleForgotPassword = async () => {
    clearError();
    await sendResetEmail(email);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      {combinedError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
          {combinedError}
        </div>
      )}

      {resetSent && (
        <div className="border text-green-400 rounded-lg p-3 mb-4 text-sm">
          Te enviamos un email para restablecer tu contraseña.
        </div>
      )}

      <div className="mb-4">
        <label className="block text-[13px] font-bold text-text-muted mb-1.5">
          Correo
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base"
          placeholder="tu@correo.com"
          required
        />
      </div>

      <div className="mb-3">
        <label className="block text-[13px] font-bold text-text-muted mb-1.5">
          Contrasena
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-base"
          placeholder="••••••••"
          required
        />
      </div>

      <div className="flex justify-end mb-5">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-[13px] font-semibold text-brand-mid hover:text-brand-mid-dark transition-colors"
        >
          Olvidaste tu contrasena?
        </button>
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? "Cargando..." : "Entrar a Triploom"}
      </button>
    </form>
  );
}
