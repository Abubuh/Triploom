import { useState } from "react";
import { LoginForm, RegisterForm, SocialAuthButton } from "../modules/auth";
import PlaneIcon from "../components/Icons/PlaneIcon";
import { useTheme } from "../context/ThemeContext";
import SunIcon from "../components/Icons/SunIcon";
import MoonIcon from "../components/Icons/MoonIcon";

function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-surface-page">
      <div className="w-full max-w-110 rounded-[1.1rem] px-9 py-10 flex flex-col bg-surface-card border-2 border-border-base shadow-[0_24px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] dark:border-border-strong">
        {" "}
        <div className="flex justify-center mb-6">
          <span className="flex items-center gap-2 text-2xl font-bold tracking-tight text-brand-dark dark:text-brand-light">
            <PlaneIcon />
            Triploom
          </span>
        </div>
        <div className="flex justify-center items-center gap-4">
          <h2 className="text-[1.85rem] font-bold tracking-tight text-center mb-1 text-text-base dark:text-text-faint">
            {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
          </h2>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg justify-center items-center flex border text-base transition-colors duration-300 border-border-base text-text-muted hover:border-brand-mid hover:text-brand-mid dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-light dark:hover:text-brand-light"
            title="Cambiar tema"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
        <p className="text-sm text-center mb-6 text-text-muted">
          {mode === "login"
            ? "Bienvenido de vuelta. Ingresa tus datos para continuar."
            : "Empieza gratis. Tu primer viaje en menos de 60 segundos."}
        </p>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-7 bg-surface-subtle border border-border-base  dark:border-border-strong">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
              mode === "login"
                ? "bg-brand-subtle text-brand-dark  dark:bg-brand-dark/40 dark:text-brand-light"
                : "bg-transparent text-text-muted"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer  ${
              mode === "register"
                ? "bg-brand-subtle text-brand-dark dark:bg-brand-dark/40 dark:text-brand-light"
                : "bg-transparent text-text-muted"
            }`}
          >
            Crear cuenta
          </button>
        </div>
        <SocialAuthButton />
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border-base" />
          <span className="text-xs font-semibold tracking-widest uppercase text-text-faint">
            o con tu correo
          </span>
          <div className="flex-1 h-px bg-border-base" />
        </div>
        {mode === "login" ? (
          <LoginForm onSwitchToRegister={() => setMode("register")} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}

export default Auth;
