import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { motion } from "framer-motion";
import { HOW_STEPS, FEATURES } from "../constants/landingValues";
import { useTheme } from "../context/ThemeContext";
import SunIcon from "../components/Icons/SunIcon";
import MoonIcon from "../components/Icons/MoonIcon";
import PlaneIcon from "../components/Icons/PlaneIcon";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

const fadeIn = (delay = 0) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, delay, ease: "easeOut" as const },
  },
});

function Landing() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const howRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div
      className="min-h-screen overflow-x-hidden leading-relaxed bg-surface-page text-text-base"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <nav className="sticky top-0 z-50 px-6 md:px-12 py-4 border-b backdrop-blur-sm bg-surface-card/95 border-border-base dark:bg-surface-page/95 dark:border-[#2a3f32]">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <span
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-brand-dark dark:text-brand-light select-none cursor-default"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <PlaneIcon /> Triploom
          </span>
          <div className="hidden md:flex items-center gap-10">
            <button
              onClick={() => scrollTo(howRef)}
              className="text-sm font-medium text-text-muted hover:text-brand-dark dark:text-brand-subtle dark:hover:text-brand-light transition-colors duration-200"
            >
              Funcion
            </button>
            <button
              onClick={() => scrollTo(featuresRef)}
              className="text-sm font-medium text-text-muted hover:text-brand-dark dark:text-brand-subtle dark:hover:text-brand-light transition-colors duration-200"
            >
              Características
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center border text-sm transition-colors border-border-base text-text-faint hover:border-brand-mid hover:text-brand-mid dark:border-[#2a3f32] dark:text-brand-subtle dark:hover:border-brand-light dark:hover:text-brand-light"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-px bg-accent-lime text-brand-dark hover:bg-accent-lime-dark hover:text-white"
            >
              Inicia sesión
            </button>
          </div>
        </div>
      </nav>
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-24 pb-28">
        <div className="flex flex-col md:flex-row md:items-start md:gap-20">
          <motion.div
            className="flex-1"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <h1
              className="text-[3.6rem] md:text-[5rem] font-bold leading-[1.05] tracking-tight text-brand-dark dark:text-white mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Planifica viajes
              <br />
              que el grupo
              <br />
              recuerde.
            </h1>
            <div className="w-16 h-[3px] bg-accent-lime mb-8" />
          </motion.div>
          <motion.div
            className="flex-1 flex flex-col justify-between pt-0 md:pt-6"
            variants={fadeIn(0.25)}
            initial="hidden"
            animate="visible"
          >
            <ul className="flex flex-col divide-y divide-border-base dark:divide-[#2a3f32] mb-10">
              {[
                "Itinerarios en base a preferencias",
                "Presupuesto colaborativo",
                "Multi-destino",
                "Documentos centralizados",
              ].map((item) => (
                <li
                  key={item}
                  className="py-3 text-[0.95rem] text-text-muted dark:text-brand-subtle"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/auth")}
                className="px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-px bg-accent-lime text-brand-dark hover:bg-accent-lime-dark hover:text-white"
              >
                Comienza gratis
              </button>
              <button
                onClick={() => scrollTo(howRef)}
                className="px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-px border border-border-base dark:border-[#2a3f32] text-text-muted dark:text-brand-subtle hover:border-brand-mid hover:text-brand-dark dark:hover:border-brand-light dark:hover:text-brand-light"
              >
                Ver cómo funciona
              </button>
            </div>
          </motion.div>
        </div>
      </section>
      <section
        ref={howRef}
        id="how"
        className="max-w-6xl mx-auto px-6 md:px-12 py-24"
      >
        <motion.div
          className="mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ amount: 0.2 }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-text-faint dark:text-brand-subtle mb-3">
            Cómo funciona
          </p>
          <h2
            className="text-[2.8rem] md:text-[3.5rem] font-bold tracking-tight text-brand-dark dark:text-white leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cuatro pasos.
            <br />
            Un viaje perfecto.
          </h2>
        </motion.div>
        <div className="flex flex-col gap-0">
          {HOW_STEPS.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeIn(i * 0.1)}
              initial="hidden"
              whileInView="visible"
              viewport={{ amount: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-[6rem_1fr_1fr] gap-6 md:gap-12 py-12 border-t border-border-base dark:border-[#2a3f32] items-start"
            >
              <span
                className="text-[4.5rem] font-bold leading-none text-brand-subtle dark:text-[#2d4f3e] select-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent-lime-dark dark:text-accent-lime mb-3">
                  {step.label}
                </p>
                <h3
                  className="text-[1.6rem] font-bold tracking-tight text-brand-dark dark:text-white mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.title}
                </h3>
                <p className="text-[0.95rem] text-text-muted dark:text-brand-subtle leading-relaxed">
                  {step.desc}
                </p>
              </div>
              {i % 2 === 0 ? (
                <img
                  src={step.images}
                  alt={step.title}
                  className="rounded-xl w-full object-cover aspect-video"
                />
              ) : (
                <div className="hidden md:block" />
              )}
            </motion.div>
          ))}
          <div className="border-t border-border-base dark:border-[#2a3f32]" />
        </div>
      </section>
      <section
        ref={featuresRef}
        id="features"
        className="max-w-6xl mx-auto px-6 md:px-12 py-24"
      >
        <motion.div
          className="mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ amount: 0.2 }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-text-faint dark:text-brand-subtle mb-3">
            Características
          </p>
          <h2
            className="text-[2.8rem] md:text-[3.5rem] font-bold tracking-tight text-brand-dark dark:text-white leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Todo lo que necesitas,
            <br />
            en un solo lugar.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeIn(i * 0.07)}
              initial="hidden"
              whileInView="visible"
              viewport={{ amount: 0.1 }}
              className="group py-8 border-t border-border-base dark:border-[#2a3f32] md:odd:pr-12 md:even:pl-12 md:even:border-l"
            >
              <div className="w-8 h-[2px] bg-border-base dark:bg-[#2a3f32] group-hover:bg-accent-lime transition-colors duration-300 mb-5" />
              <h3
                className="text-xl font-bold text-brand-dark dark:text-white mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {f.title}
              </h3>
              <p className="text-sm text-text-muted dark:text-brand-subtle leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
          <div className="border-t border-border-base dark:border-[#2a3f32] md:col-span-2" />
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ amount: 0.2 }}
          className="rounded-2xl p-12 md:p-16 bg-brand-dark dark:bg-[#0e2b1c] flex flex-col md:flex-row md:items-center md:justify-between gap-8"
        >
          <div>
            <h2
              className="text-[2.2rem] md:text-[3rem] font-bold leading-tight text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Listo para tu
              <br />
              próxima aventura?
            </h2>
            <p className="text-brand-light text-sm max-w-sm">
              Únete a viajeros que ya planifican con Triploom.
            </p>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="shrink-0 px-8 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-px bg-accent-lime text-brand-dark hover:bg-accent-lime-dark hover:text-white"
          >
            Planifica tu viaje ahora
          </button>
        </motion.div>
      </div>
      <footer className="border-t px-12 py-10 text-center border-border-base dark:border-[#2a3f32] bg-surface-subtle dark:bg-surface-subtle">
        <p className="text-sm text-text-faint dark:text-[#4a6b57]">
          &copy; 2026 Triploom. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

export default Landing;
