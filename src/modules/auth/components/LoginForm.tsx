import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import { useResetPassword } from "../hooks/useResetPassword";

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginWithGoogle: _loginWithGoogle, loading, error, clearError } = useLogin();
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
    <>
      {combinedError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-6 text-sm">
          {combinedError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="tu@email.com"
            required
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-1 block">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 transition disabled:opacity-50"
        >
          {loading ? "Cargando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={handleForgotPassword}
          className="w-full text-gray-400 hover:text-blue-400 text-sm text-center transition mt-1"
        >
          ¿Olvidaste tu contraseña?
        </button>

        {resetSent && (
          <p className="text-green-400 text-sm text-center">
            ✅ Te enviamos un email para resetear tu contraseña
          </p>
        )}
      </form>

      <p className="text-gray-400 text-sm text-center mt-6">
        ¿No tienes cuenta?{" "}
        <button
          onClick={onSwitchToRegister}
          className="text-blue-400 hover:underline"
        >
          Regístrate
        </button>
      </p>
    </>
  );
}
