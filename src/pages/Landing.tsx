import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { HOW_STEPS, FEATURES } from "../constants/landingValues";

const TICKER_CITIES =
  "PARIS · BALI · TOKIO · NUEVA YORK · CIUDAD DEL CABO · DUBAI · REIKIAVIK · BARCELONA · KIOTO · SANTORINI · AMSTERDAM · LISBOA · ";

const MOCK_TRIPS = [
  {
    name: "Paris Weekend",
    sub: "Jul 12–16 · 4 personas",
    bg: "#C2EDD5",
    accent: "#4D8C6F",
  },
  {
    name: "Bali Adventure",
    sub: "Ago 2–12 · 6 personas",
    bg: "#FAE0EC",
    accent: "#B85C7A",
  },
  {
    name: "NYC City Break",
    sub: "Sep 5–8 · 3 personas",
    bg: "#DBEAFE",
    accent: "#2563EB",
  },
  {
    name: "Iceland Trip",
    sub: "Oct 18–25 · 5 personas",
    bg: "#EDE9FE",
    accent: "#7C3AED",
  },
];

function MockDashboardCard() {
  return (
    <div
      className="bg-white rounded-[28px] p-6 w-[360px] shrink-0 shadow-[0_48px_120px_rgba(12,26,15,0.14)]"
      style={{ transform: "perspective(900px) rotateY(-5deg) rotate(1.5deg)" }}
    >
      <div className="flex justify-between items-center mb-4">
        <span
          className="text-base text-text-base"
          style={{ fontFamily: "var(--font-display)" }}
        >
          triploom
        </span>
        <div className="w-7 h-7 rounded-full bg-brand-mid flex items-center justify-center text-[9px] text-white font-bold">
          AM
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        {MOCK_TRIPS.map((t) => (
          <div
            key={t.name}
            className="rounded-[16px] p-4"
            style={{ background: t.bg }}
          >
            <div
              className="w-7 h-1 rounded mb-2.5 opacity-50"
              style={{ background: t.accent }}
            />
            <div className="font-bold text-[13px] text-text-base">{t.name}</div>
            <div className="text-[11px] text-text-muted mt-0.5">{t.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-brand-dark rounded-[14px] p-3.5 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-[#6BBE96] shrink-0 animate-pulse" />
        <div>
          <div className="text-[12px] font-bold text-brand-light">
            Creando tu itinerario de Bali...
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            Basado en 6 preferencias
          </div>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const procesoRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-surface-page text-text-base"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-16 border-b border-border-base bg-surface-page"
        style={{ height: 66 }}
      >
        <span
          className="text-[26px] text-text-base tracking-[-0.5px] cursor-default select-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          triploom
        </span>
        <div className="flex items-center gap-8">
          <button
            onClick={() => scrollTo(procesoRef)}
            className="text-sm font-semibold text-text-muted hover:text-text-base transition-colors"
          >
            El proceso
          </button>
          <button
            onClick={() => scrollTo(featuresRef)}
            className="text-sm font-semibold text-text-muted hover:text-text-base transition-colors"
          >
            Caracteristicas
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-semibold text-text-muted hover:text-text-base transition-colors"
          >
            Iniciar sesion
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="bg-text-base text-btn-text px-6 py-[11px] rounded-full text-sm font-bold transition-all duration-200 hover:bg-brand-mid hover:-translate-y-px"
          >
            Empieza gratis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1300px] mx-auto flex items-center gap-[72px] px-16 py-20">
        <div className="flex-1 max-w-[560px]">
          <div className="inline-flex items-center gap-2 bg-brand-light text-[#3A6E52] px-[18px] py-2 rounded-full text-[12px] font-extrabold tracking-[0.08em] mb-7">
            PLANIFICACION DE VIAJES CON IA
          </div>
          <h1
            className="text-[72px] leading-[1.0] tracking-[-2px] text-text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Planifica viajes que todo el grupo
            <br />
            <em className="text-brand-mid not-italic">va a amar.</em>
          </h1>
          <p className="text-[18px] leading-[1.7] text-text-muted mt-6">
            Invita amigos, comparte preferencias y deja que la IA disene el
            itinerario perfecto para todo el grupo.
          </p>
          <div className="flex gap-3.5 mt-9 flex-wrap">
            <button
              onClick={() => navigate("/auth")}
              className="bg-brand-mid text-white px-9 py-[17px] rounded-full text-base font-bold transition-all duration-200 hover:bg-brand-mid-dark hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(77,140,111,0.35)]"
            >
              Empieza gratis &rarr;
            </button>
            <button
              onClick={() => scrollTo(procesoRef)}
              className="inline-flex items-center border-2 border-brand-light text-brand-mid px-7 py-[17px] rounded-full text-base font-semibold transition-all duration-200 hover:border-brand-mid hover:bg-surface-subtle hover:-translate-y-0.5"
            >
              El proceso
            </button>
          </div>
        </div>
        <div className="flex-1 flex justify-end py-6">
          <MockDashboardCard />
        </div>
      </section>

      {/* Ticker */}
      <div className="bg-brand-dark py-3.5 overflow-hidden">
        <div className="flex animate-ticker w-max">
          <span className="whitespace-nowrap text-brand-light text-xs font-extrabold tracking-[0.12em] pr-8">
            {TICKER_CITIES}
          </span>
          <span className="whitespace-nowrap text-brand-light text-xs font-extrabold tracking-[0.12em] pr-8">
            {TICKER_CITIES}
          </span>
        </div>
      </div>

      {/* El proceso */}
      <section
        ref={procesoRef}
        id="proceso"
        className="bg-surface-page border-t border-border-base py-24 px-16"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex bg-brand-light text-[#3A6E52] px-[18px] py-2 rounded-full text-[12px] font-extrabold tracking-[0.08em] mb-5">
              4 PASOS
            </div>
            <h2
              className="text-[52px] text-text-base tracking-[-1px] leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              De la idea al
              <br />
              <em className="text-brand-mid not-italic">itinerario perfecto</em>
            </h2>
            <p className="text-[17px] text-text-muted mt-4">
              Sin peleas de grupo chat. Sin hojas de calculo. Solo tu viaje.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {HOW_STEPS.map((step, i) => (
              <div
                key={i}
                className="bg-white border border-border-base rounded-3xl p-10 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(12,26,15,0.08)]"
              >
                <div
                  className="text-[56px] leading-none text-brand-mid opacity-70 mb-5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3
                  className="text-[26px] text-text-base mb-2.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-[15px] text-text-muted leading-[1.7]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Caracteristicas */}
      <section
        ref={featuresRef}
        id="features"
        className="border-t border-border-base py-24 px-16"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex bg-brand-light text-[#3A6E52] px-[18px] py-2 rounded-full text-[12px] font-extrabold tracking-[0.08em] mb-5">
              CARACTERISTICAS
            </div>
            <h2
              className="text-[52px] text-text-base tracking-[-1px] leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Todo lo que necesitas,
              <br />
              <em className="text-brand-mid not-italic">en un solo lugar</em>
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-border-base rounded-3xl p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(12,26,15,0.08)]"
              >
                <h3
                  className="text-[22px] text-text-base mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {f.title}
                </h3>
                <p className="text-[14px] text-text-muted leading-[1.7]">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-16 pb-24">
        <div className="max-w-[1200px] mx-auto bg-brand-dark rounded-3xl px-16 py-16 flex items-center justify-between gap-8">
          <div>
            <h2
              className="text-[48px] leading-tight text-white tracking-[-1px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Listo para tu
              <br />
              proxima aventura?
            </h2>
            <p className="text-brand-light text-[15px] mt-3 max-w-sm">
              Unete a viajeros que ya planifican con Triploom.
            </p>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="shrink-0 bg-brand-mid text-white px-10 py-[17px] rounded-full text-base font-bold transition-all duration-200 hover:bg-brand-mid-dark hover:-translate-y-0.5"
          >
            Planifica tu viaje ahora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-base px-12 py-10 text-center bg-surface-page">
        <p className="text-sm text-text-faint">
          &copy; 2026 Triploom. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

export default Landing;
