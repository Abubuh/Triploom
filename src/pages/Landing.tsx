import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { motion } from "framer-motion";
import { HOW_STEPS, FEATURES } from "../constants/landingValues";
import { useTheme } from "../context/ThemeContext";
import SunIcon from "../components/Icons/SunIcon";
import MoonIcon from "../components/Icons/MoonIcon";
import PlaneIcon from "../components/Icons/PlaneIcon";

const fadeSlide = (x: number) => ({
  hidden: { opacity: 0, x },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: "easeOut" as const },
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
    <div className="min-h-screen overflow-x-hidden font-sans leading-relaxed bg-surface-page text-text-base dark:text-slate-100">
      <nav className="sticky top-0 z-50 px-6 md:px-12 py-5 border-b backdrop-blur-sm bg-surface-card/95 border-border-base dark:bg-surface-page/95 dark:border-slate-700">
        <div className="flex items-center justify-between  max-w-312.5 mx-auto">
          <span className="flex justify-center items-center gap-2 text-2xl font-bold cursor-default select-none tracking-tighter text-brand-dark dark:text-brand-light ">
            <PlaneIcon /> Triploom
          </span>
          <div className="hidden md:flex items-center gap-10">
            <button
              onClick={() => scrollTo(howRef)}
              className="text-[0.95rem] font-medium transition-colors duration-300 text-text-muted hover:text-brand-mid dark:text-slate-300 dark:hover:text-brand-light  cursor-pointer hover:underline"
            >
              Función
            </button>
            <button
              onClick={() => scrollTo(featuresRef)}
              className="text-[0.95rem] font-medium transition-colors duration-300 text-text-muted hover:text-brand-mid dark:text-slate-300 dark:hover:text-brand-light  cursor-pointer hover:underline"
            >
              Características
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg justify-center items-center flex border text-base transition-colors duration-300 border-border-base text-text-muted hover:border-brand-mid hover:text-brand-mid dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-light dark:hover:text-brand-light"
              title="Cambiar tema"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button onClick={() => navigate("/auth")} className="btn-primary">
              Inicia sesión
            </button>
          </div>
        </div>
      </nav>
      <section className="text-center mx-auto max-w-200 pt-32 pb-24 px-6 md:px-12">
        <h1 className="text-[4rem] font-bold leading-[1.1] tracking-tight mb-6">
          Planifica viajes{" "}
          <span className="text-brand-mid dark:text-brand-light">
            inteligentes
          </span>
        </h1>
        <p className="text-xl mb-10 mx-auto max-w-150 text-text-muted dark:text-slate-300">
          IA generadora de itinerarios personalizados. Colabora con amigos,
          gestiona presupuestos y descubre experiencias inolvidables - todo en
          un lugar.
        </p>
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center">
          <button onClick={() => navigate("/auth")} className="btn-primary">
            Comienza gratis
          </button>
          <button onClick={() => scrollTo(howRef)} className="btn-outline">
            Ver demo
          </button>
        </div>
      </section>
      <section
        ref={howRef}
        id="how"
        className="max-w-275 mx-auto px-6 md:px-12 py-20"
      >
        <div className="text-center mb-20">
          <h2 className="text-[2.5rem] font-bold tracking-tight mb-2">
            4 simples pasos
          </h2>
          <p className="text-lg max-w-150 mx-auto text-text-muted dark:text-slate-300">
            para planificar tu próximo viaje perfecto
          </p>
        </div>
        <div>
          {HOW_STEPS.map((step, i) => (
            <div
              key={i}
              className="step"
              style={{ marginBottom: i < HOW_STEPS.length - 1 ? "7rem" : 0 }}
            >
              <motion.div
                variants={fadeSlide(i % 2 === 0 ? -60 : 60)}
                initial="hidden"
                whileInView="visible"
                viewport={{ amount: 0.25 }}
                style={{ order: i % 2 === 1 ? 2 : undefined }}
              >
                <span className="inline-block text-brand-mid font-semibold uppercase px-3 py-1 mb-5 rounded-full text-xs tracking-widest bg-brand-subtle dark:text-brand-light dark:bg-brand-dark/40">
                  {step.label}
                </span>
                <h3 className="text-[2rem] font-bold tracking-tight mb-4">
                  {step.title}
                </h3>
                <p className="text-[1.05rem] leading-relaxed text-text-muted dark:text-slate-300">
                  {step.desc}
                </p>
              </motion.div>
              <motion.img
                src={step.images}
                alt={step.title}
                className="rounded-2xl w-full object-cover"
                variants={fadeSlide(i % 2 === 0 ? 60 : -60)}
                initial="hidden"
                whileInView="visible"
                viewport={{ amount: 0.25 }}
                style={{ order: i % 2 === 1 ? 1 : undefined }}
              />
            </div>
          ))}
        </div>
      </section>
      <section
        ref={featuresRef}
        id="features"
        className="max-w-275 mx-auto px-6 md:px-12 pt-20 pb-20"
      >
        <div className="text-center mb-12">
          <h2 className="text-[2.5rem] font-bold tracking-tight mb-4">
            Características principales
          </h2>
          <p className="text-lg max-w-150 mx-auto text-text-muted dark:text-slate-300 ">
            Todo lo que necesitas para planificar viajes inolvidables
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="transition-all duration-300 p-8 rounded-2xl border cursor-default hover:-translate-y-1 hover:border-brand-mid hover:bg-brand-subtle/30 bg-surface-card border-border-base dark:bg-surface-card dark:border-slate-700 dark:hover:border-brand-light"
            >
              <h3 className="font-bold text-xl mb-3">{f.title}</h3>
              <p className="text-[0.95rem] text-text-muted dark:text-slate-300">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
      <div className="max-w-275 mx-auto px-6 md:px-12 pb-20">
        <div className="text-center rounded-3xl p-16 border bg-brand-subtle/40 border-border-base dark:bg-brand-dark/20 dark:border-slate-700">
          <h2 className="text-[2.25rem] font-bold mb-4 text-brand-dark dark:text-brand-light">
            ¿Listo para tu próxima aventura?
          </h2>
          <p className="mb-8 text-lg text-text-muted dark:text-slate-300">
            Únete a miles de viajeros que ya planifican smarter con Triploom
          </p>
          <button onClick={() => navigate("/auth")} className="btn-primary">
            Planifica tu viaje ahora
          </button>
        </div>
      </div>
      <footer className="border-t px-12 py-12 text-center bg-surface-subtle border-border-base dark:bg-surface-subtle dark:border-slate-700">
        <p className="mb-2 text-text-muted dark:text-slate-400">
          &copy; 2026 Triploom. Todos los derechos reservados.
        </p>
        {/* <p>
          <a
            href="#"
            className="text-brand-mid font-semibold hover:underline dark:text-brand-light"
          >
            Términos
          </a>
          <span className="mx-2 text-text-faint">•</span>
          <a
            href="#"
            className="text-brand-mid font-semibold hover:underline dark:text-brand-light"
          >
            Privacidad
          </a>
          <span className="mx-2 text-text-faint">•</span>
          <a
            href="#"
            className="text-brand-mid font-semibold hover:underline dark:text-brand-light"
          >
            Contacto
          </a>
        </p> */}
      </footer>
    </div>
  );
}

export default Landing;
