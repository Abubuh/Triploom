import {
  GeneratedItinerary,
  GenerateItineraryParams,
} from "../types/trip.types";
import { buildPrompt } from "./itinerary/phase1";
import { validateItinerary } from "./itinerary/phase2";
import { postProcess } from "./itinerary/phase3";
import { enrichDestinations } from "../modules/itinerary/enrichDestinations";
import type { EnrichedDestination } from "../modules/itinerary/types/itinerary.types";
import { supabase } from "./supabase";

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No hay sesión activa");
  return token;
}

async function callClaudeAPIWithToken(prompt: string, token: string, maxTokens: number): Promise<string> {
  const response = await fetch("/api/generate-itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ prompt, maxTokens }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.type === "error" || !data.content) {
    throw new Error(
      `Anthropic API error: ${data.error?.message ?? data.message ?? JSON.stringify(data)}`,
    );
  }

  return data.content[0].text as string;
}

export const generateItinerary = async (
  params: GenerateItineraryParams,
): Promise<GeneratedItinerary> => {
  const totalDays = params.destinations.reduce((sum, d) => sum + d.days, 0);
  if (totalDays > 7) {
    throw new Error(`El viaje tiene ${totalDays} días. El máximo permitido es 7.`);
  }
  const token = await getAuthToken();

  let enriched: EnrichedDestination[] = [];
  try {
    enriched = await enrichDestinations(params.destinations, params.members, token);
  } catch (err) {
    console.warn(
      "enrichDestinations falló, continuando sin enriquecimiento:",
      err,
    );
  }

  const prompt = buildPrompt(params, enriched);
  const maxTokens = Math.min(totalDays * 1400 + 1000, 8000);
  const raw = await callClaudeAPIWithToken(prompt, token, maxTokens);

  const { itinerary, issues, summary, budgetWarnings } = validateItinerary(
    raw,
    params,
  );

  const countryByCity = Object.fromEntries(
    params.destinations.map((d) => [d.city, d.country]),
  );
  const days = postProcess(itinerary, issues, countryByCity);

  const warningMessages = issues
    .filter((i) => i.type !== "hora_limite_excedida")
    .map((i) => i.message);

  return {
    summary,
    budgetWarnings: [...budgetWarnings, ...warningMessages],
    days,
  };
};
