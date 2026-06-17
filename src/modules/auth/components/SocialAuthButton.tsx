import { useLogin } from "../hooks/useLogin";

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.2-.1-2.4-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="m6.3 14.7 6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C41.5 35.7 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"
    />
  </svg>
);

export function SocialAuthButton() {
  const { loginWithGoogle, error } = useLogin();

  return (
    <>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-[14px] p-3 mb-4 text-sm">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={loginWithGoogle}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full border border-border-base bg-white text-text-base text-sm font-semibold mb-6 hover:border-brand-mid transition-colors cursor-pointer"
      >
        <GoogleLogo /> Continuar con Google
      </button>
    </>
  );
}
