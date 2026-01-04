import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { useMemo, useState } from "react";

function StartSitPanel({ league }: { league: any }) {
  const [rosterId, setRosterId] = useState<number>(() => Number(league.teams?.[0]?.rosterId ?? 1));
  const [week, setWeek] = useState<string>(""); // blank = backend default

  const teamOptions = useMemo(() => league.teams ?? [], [league.teams]);

  const toolQuery = useQuery({
    queryKey: ["startSit", league.leagueId, rosterId, week],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("rosterId", String(rosterId));
      if (week.trim()) params.set("week", week.trim());
      return apiGet<any>(`/api/sleeper/league/${encodeURIComponent(league.leagueId)}/start-sit?${params.toString()}`);
    },
    enabled: false, // run on button click
    retry: false,
  });

  return (
    <div style={{ marginTop: 24, border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
      <h2 style={{ marginTop: 0 }}>Start/Sit (v1)</h2>
      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Team
          <select
            value={rosterId}
            onChange={(e) => setRosterId(Number(e.target.value))}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          >
            {teamOptions.map((t: any) => (
              <option key={t.rosterId} value={t.rosterId}>
                {t.name} (roster {t.rosterId})
              </option>
            ))}
          </select>
        </label>

        <label>
          Week (optional)
          <input
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            placeholder="Leave blank to use Sleeper display_week"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <button
          onClick={() => toolQuery.refetch()}
          style={{ padding: 10, cursor: "pointer" }}
          disabled={toolQuery.isFetching}
        >
          {toolQuery.isFetching ? "Running…" : "Generate suggested lineup"}
        </button>
      </div>

      {toolQuery.isError && (
        <div style={{ color: "crimson", marginTop: 12 }}>
          Failed to run tool.
        </div>
      )}

      {toolQuery.data && (
        <div style={{ marginTop: 14 }}>
          <div style={{ opacity: 0.8, fontSize: 14 }}>
            Target week: <b>{toolQuery.data.week}</b> • baseline week: <b>{toolQuery.data.baselineWeek}</b>
            {toolQuery.data.baselineSource ? ` • baseline: ${toolQuery.data.baselineSource}` : ""}
          </div>

          {toolQuery.data.notes && (
            <div style={{ marginTop: 8, opacity: 0.75 }}>{toolQuery.data.notes}</div>
          )}

          <h3>Suggested starters</h3>
          <ul style={{ display: "grid", gap: 6, paddingLeft: 18 }}>
            {toolQuery.data.picks.map((p: any, idx: number) => (
              <li key={`${p.slot}-${idx}`}>
                <b>{p.slot}</b>: {p.name}
                {p.playerId ? (
                  <>
                    {" "}
                    — {p.position ?? "?"} ({p.team ?? "FA"}) • {p.baselinePoints.toFixed(2)} pts
                    {p.injuryStatus ? ` • ${p.injuryStatus}` : ""}
                  </>
                ) : null}
              </li>
            ))}
          </ul>

          <h3>Bench (sorted by baseline)</h3>
          <ul style={{ display: "grid", gap: 6, paddingLeft: 18 }}>
            {toolQuery.data.bench.map((b: any) => (
              <li key={b.playerId}>
                {b.name} — {b.position ?? "?"} ({b.team ?? "FA"}) • {Number(b.baselinePoints).toFixed(2)} pts
                {b.injuryStatus ? ` • ${b.injuryStatus}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


export default function SleeperLeague() {
  const { leagueId } = useParams<{ leagueId: string }>();

  const leagueQuery = useQuery({
    queryKey: ["sleeperLeague", leagueId],
    queryFn: () => apiGet<any>(`/api/sleeper/league/${encodeURIComponent(leagueId!)}/normalized`),
    enabled: !!leagueId,
  });

  if (leagueQuery.isLoading) return <div>Loading league…</div>;
  if (leagueQuery.isError) return <div style={{ color: "crimson" }}>Failed to load league.</div>;

  const league = leagueQuery.data;

    return (
    <div>
        <h1>{league.name}</h1>
        <div style={{ opacity: 0.7 }}>
        {league.sport.toUpperCase()} • season {league.season} • {league.teams.length} teams
        </div>

        <div style={{ height: 16 }} />

        <h2>Teams</h2>
        <ul style={{ display: "grid", gap: 12, paddingLeft: 18 }}>
        {league.teams.map((t: any) => (
            <li key={t.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                {t.record && (
                <div style={{ opacity: 0.7 }}>
                    {t.record.wins}-{t.record.losses}{t.record.ties ? `-${t.record.ties}` : ""}
                </div>
                )}
            </div>

            <div style={{ opacity: 0.7, fontSize: 14, marginTop: 6 }}>
                Starters: {t.starters.length} • Bench: {t.bench.length}
            </div>

            <details style={{ marginTop: 8 }}>
                <summary>Show starters</summary>
                <ul>
                {t.starters.map((p: any) => (
                    <li key={p.id}>
                    {p.name} — {p.position ?? "?"} ({p.team ?? "FA"})
                    {p.injuryStatus ? ` • ${p.injuryStatus}` : ""}
                    </li>
                ))}
                </ul>
            </details>
            </li>
        ))}
        </ul>
        <StartSitPanel league={league} />
    </div>
    )}
