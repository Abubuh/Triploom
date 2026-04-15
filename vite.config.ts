import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "anthropic-dev-proxy",
      configureServer(server) {
        server.middlewares.use(
          "/api/generate-itinerary",
          async (req, res) => {
            const chunks: Buffer[] = [];
            req.on("data", (chunk) => chunks.push(chunk));
            req.on("end", async () => {
              try {
                const { prompt } = JSON.parse(
                  Buffer.concat(chunks).toString(),
                );
                const upstream = await fetch(
                  "https://api.anthropic.com/v1/messages",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
                      "anthropic-version": "2023-06-01",
                    },
                    body: JSON.stringify({
                      model: "claude-haiku-4-5",
                      max_tokens: 8000,
                      system: [
                        {
                          type: "text",
                          text: "Eres un experto organizador de viajes. Respondes ÚNICAMENTE con JSON válido, sin texto adicional ni backticks.",
                        },
                      ],
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
          },
        );
      },
    },
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
});
