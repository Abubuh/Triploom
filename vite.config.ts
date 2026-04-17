import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";

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
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
});
