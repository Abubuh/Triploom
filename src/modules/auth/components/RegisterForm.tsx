import { useState } from "react";
import { useRegister } from "../hooks/useRegister";
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
} from "../constants/authConstants";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({
  onSwitchToLogin: _onSwitchToLogin,
}: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const { register, loading, error } = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({ name, email, password, currency });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
          Nombre
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-base "
          placeholder="Tu nombre"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
          Moneda base
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="input-base"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
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

      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-base"
          placeholder="Mínimo 6 caracteres"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? "Cargando..." : "Crear cuenta gratis"}
      </button>
    </form>
  );
}
