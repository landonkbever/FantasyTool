import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiGet } from "../lib/api";

export default function SleeperLeague() {
  const { leagueId } = useParams<{ leagueId: string }>();

  const leagueQuery = useQuery({
    queryKey: ["sleeperLeague", leagueId],
    queryFn: () => apiGet<any>(`/api/sleeper/league/${encodeURIComponent(leagueId!)}`),
    enabled: !!leagueId,
  });

  if (leagueQuery.isLoading) return <div>Loading league…</div>;
  if (leagueQuery.isError) return <div style={{ color: "crimson" }}>Failed to load league.</div>;

  const { league, rosters, users } = leagueQuery.data;

  return (
    <div>
      <h1>{league?.name}</h1>
      <div style={{ opacity: 0.7 }}>
        {league?.sport?.toUpperCase()} • season {league?.season} • {league?.total_rosters} teams
      </div>

      <div style={{ height: 16 }} />

      <h2>Raw data snapshot (for now)</h2>
      <div style={{ display: "grid", gap: 12 }}>
        <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Rosters</div>
          <div style={{ opacity: 0.7, fontSize: 14 }}>Count: {rosters?.length ?? 0}</div>
        </section>

        <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Users</div>
          <div style={{ opacity: 0.7, fontSize: 14 }}>Count: {users?.length ?? 0}</div>
        </section>
      </div>

      <div style={{ height: 16 }} />

      <details>
        <summary>Show full JSON</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(leagueQuery.data, null, 2)}</pre>
      </details>
    </div>
  );
}
