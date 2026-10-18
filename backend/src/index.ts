import { createApp } from "./http/server.js";

const port = Number(process.env.PORT ?? "3000");
const host = process.env.HOST ?? "0.0.0.0";
const allowedOrigins = (process.env.AGENTTRACE_ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const app = createApp({
  frontendDir: process.env.AGENTTRACE_FRONTEND_DIR ?? "../frontend/dist",
  allowedOrigins,
});

app.server.listen(port, host, () => {
  const browserHost = host === "0.0.0.0" || host === "::" ? "localhost" : host;
  console.log(`AgentTrace backend listening on http://${browserHost}:${port}`);
  if (browserHost !== host) console.log(`Bound to ${host}:${port} for network access`);
});

function shutdown(): void {
  app.server.close(() => {
    app.close();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
