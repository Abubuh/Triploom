export const DEFAULT_CURRENCY = "MXN";
export const MIN_PASSWORD_LENGTH = 6;

export const SUPPORTED_CURRENCIES = [
  { value: "MXN", label: "🇲🇽 MXN — Peso mexicano" },
  { value: "USD", label: "🇺🇸 USD — Dólar americano" },
  { value: "EUR", label: "🇪🇺 EUR — Euro" },
  { value: "GBP", label: "🇬🇧 GBP — Libra esterlina" },
  { value: "CAD", label: "🇨🇦 CAD — Dólar canadiense" },
  { value: "ARS", label: "🇦🇷 ARS — Peso argentino" },
  { value: "COP", label: "🇨🇴 COP — Peso colombiano" },
  { value: "CLP", label: "🇨🇱 CLP — Peso chileno" },
] as const;
