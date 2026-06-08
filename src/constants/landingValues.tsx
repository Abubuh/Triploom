import AI from "../assets/AI.png";
import link from "../assets/link.png";
import prefs from "../assets/prefs.png";
import steps from "../assets/steps.png";

export const HOW_STEPS: {
  label: string;
  title: string;
  desc: string;
  images: string;
}[] = [
  {
    label: "Paso uno",
    title: "Crea tu viaje",
    desc: "Define el destino, las fechas y el presupuesto inicial de tu próxima aventura. Solo necesitas unos minutos para empezar.",
    images: steps,
  },
  {
    label: "Paso dos",
    title: "Invita a tus amigos",
    desc: "Comparte un link con tus acompañantes y agrégalos al viaje en segundos. Todos pueden participar desde cualquier dispositivo.",
    images: link,
  },
  {
    label: "Paso tres",
    title: "Preferencias del grupo",
    desc: "Cada viajero completa sus gustos, intereses y restricciones para que el itinerario sea verdaderamente personalizado.",
    images: prefs,
  },
  {
    label: "Paso cuatro",
    title: "La IA genera tu plan",
    desc: "Nuestra IA crea un itinerario optimizado combinando todas las preferencias del grupo, presupuesto y tiempo disponible.",
    images: AI,
  },
];

export const FEATURES = [
  {
    title: "Itinerarios con IA",
    desc: "Generador inteligente basado en preferencias, presupuesto y velocidad de viaje",
  },
  {
    title: "Gestor de presupuesto",
    desc: "Trackea gastos por día, categoría y moneda. Alertas inteligentes de límites",
  },
  {
    title: "Almacenamiento seguro",
    desc: "Guarda pasaportes, boletos y documentos en un lugar centralizado",
  },
  {
    title: "Colaboración en tiempo real",
    desc: "Invita viajeros, edita itinerarios juntos y toma decisiones en grupo",
  },
  {
    title: "Itinerarios editables",
    desc: "Personaliza títulos, descripciones y descarga todo en PDF",
  },
  {
    title: "Multi-destino",
    desc: "Planifica viajes con múltiples paradas y conexiones",
  },
];
