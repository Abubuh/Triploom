import { useNavigate } from "react-router-dom";
import StarsIcon from "../components/Icons/StarsIcon";
import MapIcon from "../components/Icons/MapIcon";
import GroupIcon from "../components/Icons/GroupIcon";
import MoneyIcon from "../components/Icons/MoneyIcon";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Triploom
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="lucide lucide-plane-icon lucide-plane"
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
        </h1>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/auth")}
            className="text-gray-400 hover:text-white transition"
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold transition"
          >
            Empezar gratis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 pt-24 pb-32 max-w-4xl mx-auto">
        <span className="bg-blue-500/10 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6 flex items-center gap-2">
          Planifica viajes con IA <StarsIcon />
        </span>
        <h2 className="text-5xl font-bold leading-tight mb-6">
          Organiza tu viaje perfecto{" "}
          <span className="text-blue-500">con tus amigos</span>
        </h2>
        <p className="text-gray-400 text-xl max-w-2xl">
          Dinos el destino, tu presupuesto y tu estilo de viaje —
        </p>
        <p className="text-gray-400 text-xl mb-10 max-w-2xl">
          Triploom se encarga de todo lo demás.
        </p>
        <button
          onClick={() => navigate("/auth")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition"
        >
          Planifica tu primer viaje →
        </button>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 pb-32 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: <MapIcon />,
            title: "Itinerario con IA",
            desc: "Nuestra IA genera un plan día a día considerando los gustos de todo el grupo.",
          },
          {
            icon: <GroupIcon />,
            title: "Viaja en grupo",
            desc: "Invita a tus amigos, voten destinos y organícense juntos en un solo lugar.",
          },
          {
            icon: <MoneyIcon />,
            title: "Control de gastos",
            desc: "Registra lo que gastas y mantén tu presupuesto bajo control durante el viaje.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4"
          >
            <div className="flex gap-3 items-center">
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <span className="text-4xl flex ">{feature.icon}</span>
            </div>
            <p className="text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Landing;
