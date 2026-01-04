import fs from "node:fs/promises";
import path from "node:path";

const SLEEPER_BASE = "https://api.sleeper.app/v1";
const CACHE_DIR = path.join(process.cwd(), ".cache");

export type SleeperPlayer = {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;      // NFL: QB/RB/WR/TE/K/DEF, etc.
  team?: string;          // NFL team abbrev
  sport?: string;
  fantasy_positions?: string[];
  injury_status?: string;
  active?: boolean;
};

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Sleeper ${resp.status}: ${await resp.text()}`);
  return (await resp.json()) as T;
}

export async function getSleeperPlayers(sport: "nfl" | "nba"): Promise<Record<string, SleeperPlayer>> {
  await ensureCacheDir();

  const cacheFile = path.join(CACHE_DIR, `sleeper_players_${sport}.json`);

  // Try cache first
  try {
    const raw = await fs.readFile(cacheFile, "utf-8");
    return JSON.parse(raw) as Record<string, SleeperPlayer>;
  } catch {
    // ignore
  }

  // Fetch + cache
  const url = `${SLEEPER_BASE}/players/${sport}`;
  const data = await fetchJson<Record<string, SleeperPlayer>>(url);
  await fs.writeFile(cacheFile, JSON.stringify(data), "utf-8");
  return data;
}
