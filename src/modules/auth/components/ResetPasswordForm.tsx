import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResetPassword } from "../hooks/useResetPassword";

const inputCls =
  "w-full px-[18px] py-[13px] border border-border-base rounded-[14px] text-[14px] text-text-base bg-white outline-none transition hover:border-brand-mid focus:border-text-base placeholder-text-faint";

const labelCls = "text-[13px] font-bold text-text-muted block mb-1.5";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const { updatePassword, loading, error } = useResetPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await updatePassword(password, confirm);
    if (ok) {
      setSuccess(true);
      navigate("/dashboard");
    }
  };

  if (success) {
    return (
      <div className="bg-brand-light border border-brand-subtle text-[#3A6E52] rounded-[14px] p-4 text-center text-sm font-semibold">
        Contraseña actualizada, redirigiendo...
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-[14px] p-3 mb-5 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className={labelCls}>Confirmar contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-mid hover:bg-brand-mid-dark text-white font-extrabold rounded-full py-4 text-[15px] transition-colors mt-1 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </form>
    </>
  );
}
