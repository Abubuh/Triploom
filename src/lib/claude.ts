import {
  GeneratedItinerary,
  GenerateItineraryParams,
} from "../types/trip.types";
import { buildPrompt } from "./itinerary/phase1";
import { validateItinerary } from "./itinerary/phase2";
import { postProcess } from "./itinerary/phase3";

async function callClaudeAPI(prompt: string): Promise<string> {
  const response = await fetch("/api/generate-itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
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
  const prompt = buildPrompt(params);
  const raw = await callClaudeAPI(prompt);

  const { itinerary, issues, summary, budgetWarnings } = validateItinerary(
    raw,
    params,
  );

  const days = postProcess(itinerary, issues);

  const warningMessages = issues
    .filter((i) => i.type !== "hora_limite_excedida")
    .map((i) => i.message);

  return {
    summary,
    budgetWarnings: [...budgetWarnings, ...warningMessages],
    days,
  };
};
