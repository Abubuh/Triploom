import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white">Triploom ✈️</h1>
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
        <span className="bg-blue-500/10 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Planifica viajes con IA ✨
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
            icon: "🗺️",
            title: "Itinerario con IA",
            desc: "Nuestra IA genera un plan día a día considerando los gustos de todo el grupo.",
          },
          {
            icon: "👥",
            title: "Viaja en grupo",
            desc: "Invita a tus amigos, voten destinos y organícense juntos en un solo lugar.",
          },
          {
            icon: "💸",
            title: "Control de gastos",
            desc: "Registra lo que gastas y mantén tu presupuesto bajo control durante el viaje.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4"
          >
            <span className="text-4xl">{feature.icon}</span>
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <p className="text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Landing;
