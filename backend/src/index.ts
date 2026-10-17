import { createApp } from "./http/server.js";

const port = Number(process.env.PORT ?? "3000");
const host = process.env.HOST ?? "0.0.0.0";
const app = createApp({
  frontendDir: process.env.AGENTTRACE_FRONTEND_DIR ?? "../frontend",
});

app.server.listen(port, host, () => {
  console.log(`AgentTrace backend listening on http://${host}:${port}`);
});

function shutdown(): void {
  app.server.close(() => {
    app.close();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
