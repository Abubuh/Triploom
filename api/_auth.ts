import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Extrae y verifica el JWT de Supabase del header Authorization.
 * Lanza AuthError si el token falta o es inválido.
 */
export async function requireAuth(req: VercelRequest): Promise<{ id: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Authorization header faltante o inválido");
  }

  const token = authHeader.slice(7);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new AuthError("Configuración del servidor incompleta", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError("Token inválido o expirado");
  }

  return data.user;
}

/**
 * Devuelve true y responde 401 si err es AuthError. Úsalo en el catch de cada handler.
 */
export function handleAuthError(
  err: unknown,
  res: VercelResponse,
): boolean {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}
