import PlaneIcon from "../components/Icons/PlaneIcon";
import { ResetPasswordForm } from "../modules/auth";

function ResetPassword() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          Triploom <PlaneIcon />
        </h1>
        <p className="text-gray-400 mb-8">Crea tu nueva contraseña</p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}

export default ResetPassword;
