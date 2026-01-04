import { Router } from "express";
import { getSleeperPlayers } from "../lib/sleeperPlayers";
import { normalizeSleeperLeague } from "../lib/normalizeSleeper";
import { buildStartSit } from "../lib/startSit";


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

router.get("/players/:sport", async (req, res) => {
  try {
    const sport = req.params.sport as "nfl" | "nba";
    if (sport !== "nfl" && sport !== "nba") {
      return res.status(400).json({ error: "sport must be nfl or nba" });
    }
    const players = await getSleeperPlayers(sport);
    res.json({ ok: true, count: Object.keys(players).length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

router.get("/league/:leagueId/normalized", async (req, res) => {
  try {
    const { leagueId } = req.params;

    const [league, rosters, users] = await Promise.all([
      sleeperGet<any>(`/league/${encodeURIComponent(leagueId)}`),
      sleeperGet<any[]>(`/league/${encodeURIComponent(leagueId)}/rosters`),
      sleeperGet<any[]>(`/league/${encodeURIComponent(leagueId)}/users`),
    ]);

    const sport = league?.sport as "nfl" | "nba";
    if (sport !== "nfl" && sport !== "nba") {
      return res.status(400).json({ error: `Unsupported sport: ${sport}` });
    }

    const playerDict = await getSleeperPlayers(sport);

    const normalized = normalizeSleeperLeague({ league, rosters, users, playerDict });
    res.json(normalized);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});


router.get("/league/:leagueId/start-sit", async (req, res) => {
  try {
    const { leagueId } = req.params;
    const rosterId = Number(req.query.rosterId);
    if (!Number.isFinite(rosterId)) {
      return res.status(400).json({ error: "Missing/invalid rosterId" });
    }

    // Load league + rosters
    const [league, rosters] = await Promise.all([
      sleeperGet<any>(`/league/${encodeURIComponent(leagueId)}`),
      sleeperGet<any[]>(`/league/${encodeURIComponent(leagueId)}/rosters`),
    ]);

    const sport = league?.sport as "nfl" | "nba";
    if (sport !== "nfl") {
      return res.status(400).json({ error: `Start/Sit v1 currently supports nfl only (got ${sport})` });
    }

    // Determine target week (default to Sleeper display_week)
    const state = await sleeperGet<any>(`/state/${sport}`);
    const defaultWeek = Number(state?.display_week ?? state?.week ?? 1);
    const week = req.query.week ? Number(req.query.week) : defaultWeek;

    const baselineWeek = Math.max(1, week - 1);

    const roster = rosters.find((r) => Number(r.roster_id) === rosterId);
    if (!roster) return res.status(404).json({ error: `Roster ${rosterId} not found` });

    // Current roster players (IDs)
    const rosterPlayerIds: string[] = Array.isArray(roster.players) ? roster.players.filter(Boolean) : [];

    // Players dictionary (cached on disk)
    const playerDict = await getSleeperPlayers("nfl");

    // Baseline points from last week’s matchup (if available)
    const matchups = await sleeperGet<any[]>(
      `/league/${encodeURIComponent(leagueId)}/matchups/${encodeURIComponent(String(baselineWeek))}`
    );

    const myMatchup = matchups.find((m) => Number(m.roster_id) === rosterId);

    const baselinePointsByPlayerId: Record<string, number> = {};
    let baselineSource: "players_points" | "unknown" = "unknown";

    if (myMatchup?.players_points && typeof myMatchup.players_points === "object") {
      // Best-case (often present): a map of { [playerId]: points }
      baselineSource = "players_points";
      for (const [pid, pts] of Object.entries(myMatchup.players_points)) {
        baselinePointsByPlayerId[String(pid)] = Number(pts ?? 0);
      }
    } else if (Array.isArray(myMatchup?.starters) && Array.isArray(myMatchup?.starters_points)) {
      // Sometimes: starters_points aligned with starters array
      baselineSource = "players_points"; // close enough
      for (let i = 0; i < myMatchup.starters.length; i++) {
        const pid = String(myMatchup.starters[i]);
        baselinePointsByPlayerId[pid] = Number(myMatchup.starters_points[i] ?? 0);
      }
    }

    const { picks, bench } = buildStartSit({
      leagueRosterPositions: Array.isArray(league?.roster_positions) ? league.roster_positions : [],
      rosterPlayerIds,
      playerDict,
      baselinePointsByPlayerId,
    });

    res.json({
      leagueId,
      rosterId,
      week,
      baselineWeek,
      baselineSource,
      picks,
      bench,
      notes:
        baselineSource === "unknown"
          ? "Could not find per-player points in Sleeper matchup response; baseline points defaulted to 0. Tool still returns a valid lineup."
          : undefined,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});



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
