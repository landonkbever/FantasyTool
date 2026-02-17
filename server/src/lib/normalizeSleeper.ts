import type { SleeperPlayer } from "./sleeperPlayers";

export type NormalizedPlayer = {
  id: string;
  name: string;
  position?: string;
  team?: string;
  injuryStatus?: string;
};

export type NormalizedTeam = {
  id: string;           // roster_id as string
  name: string;         // owner display name + team name if available
  ownerId?: string;
  rosterId: number;
  record?: { wins: number; losses: number; ties?: number };
  pointsFor?: number;
  pointsAgainst?: number;
  starters: NormalizedPlayer[];
  bench: NormalizedPlayer[];
};

export type NormalizedLeague = {
  platform: "sleeper";
  sport: "nfl" | "nba";
  season: string;
  leagueId: string;
  name: string;
  rosterPositions: string[];   // lineup slots
  teams: NormalizedTeam[];
};

function playerName(p?: SleeperPlayer) {
  if (!p) return "Unknown Player";
  return (
    p.full_name ??
    [p.first_name, p.last_name].filter(Boolean).join(" ") ??
    "Unknown Player"
  );
}

function toNormPlayer(playerId: string, dict: Record<string, SleeperPlayer>): NormalizedPlayer {
  const p = dict[playerId];
  const player: NormalizedPlayer = {
    id: playerId,
    name: playerName(p),
  };

  if (p?.position) player.position = p.position;
  if (p?.team) player.team = p.team;
  if (p?.injury_status) player.injuryStatus = p.injury_status;

  return player;
}

export function normalizeSleeperLeague(args: {
  league: any;
  rosters: any[];
  users: any[];
  playerDict: Record<string, SleeperPlayer>;
}): NormalizedLeague {
  const { league, rosters, users, playerDict } = args;

  const userById = new Map<string, any>();
  for (const u of users) userById.set(u.user_id, u);

  const teams: NormalizedTeam[] = rosters.map((r) => {
    const owner = r.owner_id ? userById.get(r.owner_id) : null;

    const startersIds: string[] = Array.isArray(r.starters) ? r.starters.filter(Boolean) : [];
    const allIds: string[] = Array.isArray(r.players) ? r.players.filter(Boolean) : [];

    const starterSet = new Set(startersIds);
    const benchIds = allIds.filter((id) => !starterSet.has(id));

    const starters = startersIds.map((pid) => toNormPlayer(pid, playerDict));
    const bench = benchIds.map((pid) => toNormPlayer(pid, playerDict));

    const displayName =
      owner?.metadata?.team_name ||
      owner?.display_name ||
      owner?.username ||
      `Roster ${r.roster_id}`;

    const team: NormalizedTeam = {
      id: String(r.roster_id),
      rosterId: r.roster_id,
      name: displayName,
      starters,
      bench,
    };

    if (r.owner_id) team.ownerId = r.owner_id;

    if (r.settings) {
      team.record = {
        wins: Number(r.settings.wins ?? 0),
        losses: Number(r.settings.losses ?? 0),
        ties: Number(r.settings.ties ?? 0),
      };
    }

    if (r.settings?.fpts != null) team.pointsFor = Number(r.settings.fpts);
    if (r.settings?.fpts_against != null) team.pointsAgainst = Number(r.settings.fpts_against);

    return team;
  });

  return {
    platform: "sleeper",
    sport: league?.sport,
    season: String(league?.season ?? ""),
    leagueId: String(league?.league_id ?? ""),
    name: league?.name ?? "Sleeper League",
    rosterPositions: Array.isArray(league?.roster_positions) ? league.roster_positions : [],
    teams,
  };
}
