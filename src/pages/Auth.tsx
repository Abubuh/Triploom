import { useState } from "react";
import PlaneIcon from "../components/Icons/PlaneIcon";
import { LoginForm, RegisterForm, SocialAuthButton } from "../modules/auth";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <PlaneIcon />
          Triploom
        </h1>
        <p className="text-gray-400 mb-8">
          {isLogin ? "Bienvenido de vuelta" : "Crea tu cuenta"}
        </p>

        <SocialAuthButton />

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-sm">o</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}

export default Auth;
