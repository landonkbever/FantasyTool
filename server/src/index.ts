import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import sleeperRoutes from "./routes/sleeper";

dotenv.config();

const app = express();
app.use(express.json());

// allow local web dev server to call the API
app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/sleeper", sleeperRoutes);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
