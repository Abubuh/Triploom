import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm, RegisterForm, SocialAuthButton } from "../modules/auth";

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const isLogin = mode === "login";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-surface-page"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <button
        onClick={() => navigate("/")}
        className="mb-10 text-[28px] text-text-base tracking-[-0.5px] bg-transparent cursor-pointer"
        style={{ fontFamily: "var(--font-display)" }}
      >
        triploom
      </button>

      <div className="bg-white rounded-[28px] px-12 py-12 w-full max-w-[480px] shadow-[0_40px_120px_rgba(12,26,15,0.1)] border border-border-base">
        {/* Badge */}
        <div className="inline-flex bg-brand-light text-[#3A6E52] px-[18px] py-2 rounded-full text-[11px] font-extrabold tracking-[0.08em] mb-5">
          {isLogin ? "BIENVENIDO DE VUELTA" : "UNETE A TRIPLOOM GRATIS"}
        </div>

        {/* Title */}
        <h1
          className="text-[44px] text-text-base tracking-[-1.5px] leading-[1.0] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {isLogin ? "Inicia sesion" : "Crea tu cuenta"}
        </h1>
        <p
          className="text-[14px] leading-[1.6] mb-8"
          style={{ color: isLogin ? "#607A65" : "#4D8C6F" }}
        >
          {isLogin
            ? "Ingresa tus datos para continuar donde lo dejaste."
            : "Empieza gratis. Tu primer viaje en menos de 60 segundos."}
        </p>

        {/* Tab switcher */}
        <div className="bg-surface-page rounded-full p-1 flex gap-1 mb-7">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-[11px] rounded-full text-sm font-bold transition-all duration-150 cursor-pointer ${
              isLogin
                ? "bg-white text-text-base shadow-[0_2px_8px_rgba(12,26,15,0.08)]"
                : "bg-transparent text-text-muted"
            }`}
          >
            Iniciar sesion
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-[11px] rounded-full text-sm font-bold transition-all duration-150 cursor-pointer ${
              !isLogin
                ? "bg-white text-text-base shadow-[0_2px_8px_rgba(12,26,15,0.08)]"
                : "bg-transparent text-text-muted"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Google */}
        <SocialAuthButton />

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border-base" />
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-text-faint">
            O CON TU CORREO
          </span>
          <div className="flex-1 h-px bg-border-base" />
        </div>

        {/* Form */}
        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setMode("register")} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}

export default Auth;
