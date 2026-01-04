import type { SleeperPlayer } from "./sleeperPlayers";

export type StartSitPick = {
  slot: string;
  playerId: string;
  name: string;
  position?: string;
  team?: string;
  injuryStatus?: string;
  baselinePoints: number;
};

function getFantasyPositions(p?: SleeperPlayer): string[] {
  const fp = p?.fantasy_positions?.filter(Boolean);
  if (fp && fp.length) return fp;
  if (p?.position) return [p.position];
  return [];
}

// Slot eligibility (NFL-focused)
export function isEligible(slot: string, playerPositions: string[]): boolean {
  const posSet = new Set(playerPositions);

  // Normalize a few common values
  const s = slot.toUpperCase();

  const has = (...positions: string[]) => positions.some((x) => posSet.has(x));

  // Common bench/reserve slots: we don't fill these as starters
  if (["BN", "BENCH", "IR", "RES", "TAXI"].includes(s)) return false;

  // Exact slots
  if (["QB", "RB", "WR", "TE", "K"].includes(s)) return posSet.has(s);
  if (["DEF", "DST"].includes(s)) return has("DEF", "DST");

  // Flex slots
  if (["FLEX"].includes(s)) return has("RB", "WR", "TE");
  if (["WRRB_FLEX", "RBWR_FLEX"].includes(s)) return has("RB", "WR");
  if (["REC_FLEX", "WRTE_FLEX"].includes(s)) return has("WR", "TE");
  if (["SUPER_FLEX", "SFLEX"].includes(s)) return has("QB", "RB", "WR", "TE");

  // If unknown slot, be permissive (so tool still works)
  return true;
}

export function buildStartSit(args: {
  leagueRosterPositions: string[];
  rosterPlayerIds: string[];
  playerDict: Record<string, SleeperPlayer>;
  baselinePointsByPlayerId: Record<string, number>;
}) {
  const { leagueRosterPositions, rosterPlayerIds, playerDict, baselinePointsByPlayerId } = args;

  // Candidates: players on roster, with baseline points
  const candidates = rosterPlayerIds
    .filter(Boolean)
    .map((pid) => {
      const p = playerDict[pid];
      return {
        playerId: pid,
        name: p?.full_name ?? "Unknown Player",
        position: p?.position,
        team: p?.team,
        injuryStatus: p?.injury_status,
        fantasyPositions: getFantasyPositions(p),
        baselinePoints: Number(baselinePointsByPlayerId[pid] ?? 0),
      };
    })
    .sort((a, b) => b.baselinePoints - a.baselinePoints);

  const used = new Set<string>();
  const picks: StartSitPick[] = [];

  // Fill only *starting* slots (exclude BN/IR/etc by eligibility check)
  for (const slot of leagueRosterPositions) {
    // skip bench-ish slots entirely
    if (["BN", "BENCH", "IR", "RES", "TAXI"].includes(slot.toUpperCase())) continue;

    const pick = candidates.find(
      (c) => !used.has(c.playerId) && isEligible(slot, c.fantasyPositions)
    );

    if (pick) {
      used.add(pick.playerId);
      picks.push({
        slot,
        playerId: pick.playerId,
        name: pick.name,
        position: pick.position,
        team: pick.team,
        injuryStatus: pick.injuryStatus,
        baselinePoints: pick.baselinePoints,
      });
    } else {
      // no eligible player found -> empty slot
      picks.push({
        slot,
        playerId: "",
        name: "(no eligible player found)",
        baselinePoints: 0,
      });
    }
  }

  const bench = candidates
    .filter((c) => !used.has(c.playerId))
    .map((c) => ({
      playerId: c.playerId,
      name: c.name,
      position: c.position,
      team: c.team,
      injuryStatus: c.injuryStatus,
      baselinePoints: c.baselinePoints,
    }));

  return { picks, bench };
}
