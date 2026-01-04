import { Router } from "express";

const router = Router();

const SLEEPER_BASE = "https://api.sleeper.app/v1";

async function sleeperGet<T>(path: string): Promise<T> {
  const url = `${SLEEPER_BASE}${path}`;
  const resp = await fetch(url);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Sleeper error ${resp.status}: ${text}`);
  }

  return (await resp.json()) as T;
}

/**
 * GET /api/sleeper/user/:username
 */
router.get("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const data = await sleeperGet<any>(`/user/${encodeURIComponent(username)}`);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

/**
 * GET /api/sleeper/leagues/:userId/:sport/:season
 * sport: "nfl" (football) | "nba" (basketball)
 * season: "2025", "2024", ...
 */
router.get("/leagues/:userId/:sport/:season", async (req, res) => {
  try {
    const { userId, sport, season } = req.params;
    const data = await sleeperGet<any[]>(
      `/user/${encodeURIComponent(userId)}/leagues/${encodeURIComponent(
        sport
      )}/${encodeURIComponent(season)}`
    );
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

/**
 * GET /api/sleeper/league/:leagueId
 * Returns league, rosters, users (owners), matchups (week optional)
 */
router.get("/league/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;
    const week = req.query.week ? String(req.query.week) : undefined;

    const [league, rosters, users] = await Promise.all([
      sleeperGet<any>(`/league/${encodeURIComponent(leagueId)}`),
      sleeperGet<any[]>(`/league/${encodeURIComponent(leagueId)}/rosters`),
      sleeperGet<any[]>(`/league/${encodeURIComponent(leagueId)}/users`),
    ]);

    const matchups = week
      ? await sleeperGet<any[]>(
          `/league/${encodeURIComponent(leagueId)}/matchups/${encodeURIComponent(
            week
          )}`
        )
      : null;

    res.json({ league, rosters, users, matchups });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

export default router;
