import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import { buildGeoapifyUrl } from "./api/_geoapify";

function readAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  for (const file of [".env.local", ".env"]) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const match = content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m);
      if (match?.[1]) return match[1];
    } catch {
      // file doesn't exist, try next
    }
  }
  return "";
}

function readEnvKey(name: string): string {
  if (process.env[name]) return process.env[name] as string;
  for (const file of [".env.local", ".env"]) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const match = content.match(
        new RegExp(`^${name}=["']?([^"'\\r\\n]+)["']?`, "m"),
      );
      if (match?.[1]) return match[1];
    } catch {
      // file doesn't exist, try next
    }
  }
  return "";
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "anthropic-dev-proxy",
      configureServer(server) {
        const apiKey = readAnthropicKey();
        server.middlewares.use("/api/generate-itinerary", (req, res) => {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", async () => {
            try {
              const { prompt } = JSON.parse(Buffer.concat(chunks).toString());
              const upstream = await fetch(
                "https://api.anthropic.com/v1/messages",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                  },
                  body: JSON.stringify({
                    model: "claude-haiku-4-5",
                    max_tokens: 8000,
                    messages: [{ role: "user", content: prompt }],
                  }),
                },
              );
              const data = await upstream.json();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        });

        server.middlewares.use("/api/chat-itinerary", (req, res) => {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", async () => {
            try {
              const { instructions, itineraryText, messages } = JSON.parse(
                Buffer.concat(chunks).toString(),
              );
              const upstream = await fetch(
                "https://api.anthropic.com/v1/messages",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-beta": "prompt-caching-2024-07-31",
                  },
                  body: JSON.stringify({
                    model: "claude-haiku-4-5",
                    max_tokens: 4000,
                    system: [
                      { type: "text", text: instructions },
                      {
                        type: "text",
                        text: itineraryText,
                        cache_control: { type: "ephemeral" },
                      },
                    ],
                    messages,
                  }),
                },
              );
              const data = await upstream.json();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        });
      },
    },
    {
      name: "geoapify-dev-proxy",
      configureServer(server) {
        const apiKey = readEnvKey("GEOAPIFY_API_KEY");
        server.middlewares.use("/api/geo", (req, res) => {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", async () => {
            try {
              const body = JSON.parse(
                Buffer.concat(chunks).toString() || "{}",
              );
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "GEOAPIFY_API_KEY no está configurada (.env.local)",
                  }),
                );
                return;
              }
              const url = buildGeoapifyUrl(body, apiKey);
              if (!url) {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({
                    error: `Acción no soportada: ${body.action}`,
                  }),
                );
                return;
              }
              const upstream = await fetch(url);
              const data = await upstream.json();
              res.statusCode = upstream.status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        });
      },
    },
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
});
