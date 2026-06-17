import { useNavigate } from "react-router-dom";
import { ResetPasswordForm } from "../modules/auth";

function ResetPassword() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-surface-page flex flex-col items-center justify-center px-5 py-12"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <button
        onClick={() => navigate("/")}
        className="bg-transparent cursor-pointer mb-10"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          color: "#0C1A0F",
          letterSpacing: "-0.5px",
        }}
      >
        triploom
      </button>

      <div className="bg-white rounded-[28px] px-12 py-12 w-full max-w-[480px] border border-border-base shadow-[0_40px_120px_rgba(12,26,15,0.1)]">
        <div className="inline-flex bg-brand-light text-[#3A6E52] px-[18px] py-2 rounded-full text-[11px] font-extrabold tracking-[0.08em] mb-5">
          NUEVA CONTRASEÑA
        </div>
        <h1
          className="text-[44px] text-text-base leading-[1.0] tracking-[-1.5px] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Crea tu nueva contraseña
        </h1>
        <p className="text-[14px] leading-[1.6] text-text-muted mb-8">
          Elige una contraseña segura de al menos 6 caracteres.
        </p>

        <ResetPasswordForm />
      </div>
    </div>
  );
}

export default ResetPassword;
