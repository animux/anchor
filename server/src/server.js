import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import studentsRoutes from "./routes/students.js";
import submissionsRoutes from "./routes/submissions.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/submissions", submissionsRoutes);

app.use((error, _req, res, _next) => {
  // Keep error responses stable and avoid leaking internals.
  const message = error?.message || "Internal server error";
  const status = Number(error?.status) || 500;
  res.status(status).json({ message });
});

async function start() {
  await connectDatabase(env.mongodbUri);
  app.listen(env.port, () => {
    console.log(`SSP server listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
