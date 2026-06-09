import type { VercelRequest } from "@vercel/node";

// Allowlist de Origin para las funciones serverless. La SPA llama a /api/* con
// POST mismo-origen, así que el navegador siempre manda `Origin` y coincide con
// el `Host` del deployment. Bloquea abuso casual (curl sin Origin, hotlinking
// de otro dominio). No bloquea a quien falsifique el header — para eso haría
// falta verificar el JWT de Supabase (follow-up). El dev-proxy de Vite no usa
// esto (corre en localhost, no expuesto).

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function isAllowedOrigin(req: VercelRequest): boolean {
  const origin = headerValue(req.headers.origin);
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = headerValue(req.headers.host);
  if (host && originHost === host) return true;

  const allowed = (process.env.ALLOWED_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.some((a) => {
    try {
      return new URL(a).host === originHost;
    } catch {
      return a === originHost;
    }
  });
}
