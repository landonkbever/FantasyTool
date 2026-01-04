import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { Link } from "react-router-dom";

type SleeperUser = {
  user_id: string;
  username: string;
  display_name?: string;
  avatar?: string;
};

type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  total_rosters: number;
};

function currentSeasonGuess() {
  // simple default for now; you can make this smarter later
  const year = new Date().getFullYear();
  return String(year);
}

export default function SleeperConnect() {
  const [username, setUsername] = useState("");
  const [season, setSeason] = useState(currentSeasonGuess());
  const [sport, setSport] = useState<"nfl" | "nba">("nfl");

  const canFetchUser = username.trim().length > 0;

  const userQuery = useQuery({
    queryKey: ["sleeperUser", username],
    queryFn: () => apiGet<SleeperUser>(`/api/sleeper/user/${encodeURIComponent(username.trim())}`),
    enabled: canFetchUser,
    retry: false,
  });

  const userId = userQuery.data?.user_id;

  const leaguesQuery = useQuery({
    queryKey: ["sleeperLeagues", userId, sport, season],
    queryFn: () =>
      apiGet<SleeperLeague[]>(
        `/api/sleeper/leagues/${encodeURIComponent(userId!)}/${sport}/${encodeURIComponent(season)}`
      ),
    enabled: !!userId,
    retry: false,
  });

  const leagues = useMemo(() => leaguesQuery.data ?? [], [leaguesQuery.data]);

  return (
    <div>
      <h1>Connect Sleeper</h1>

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Sleeper username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. landonbever"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Sport
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value as "nfl" | "nba")}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          >
            <option value="nfl">NFL (Fantasy Football)</option>
            <option value="nba">NBA (Fantasy Basketball)</option>
          </select>
        </label>

        <label>
          Season (year)
          <input
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="2025"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ height: 16 }} />

      {!canFetchUser ? (
        <div style={{ opacity: 0.7 }}>Enter a username to load leagues.</div>
      ) : userQuery.isLoading ? (
        <div>Loading user…</div>
      ) : userQuery.isError ? (
        <div style={{ color: "crimson" }}>
          Could not load Sleeper user. Double-check the username.
        </div>
      ) : (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>
            {userQuery.data?.display_name ?? userQuery.data?.username}
          </div>
          <div style={{ opacity: 0.7 }}>user_id: {userQuery.data?.user_id}</div>
        </div>
      )}

      <div style={{ height: 16 }} />

      {!!userId && (
        <div>
          <h2>Leagues</h2>
          {leaguesQuery.isLoading ? (
            <div>Loading leagues…</div>
          ) : leaguesQuery.isError ? (
            <div style={{ color: "crimson" }}>Could not load leagues for that season/sport.</div>
          ) : leagues.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No leagues found.</div>
          ) : (
            <ul style={{ display: "grid", gap: 10, paddingLeft: 18 }}>
              {leagues.map((l) => (
                <li key={l.league_id}>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div style={{ opacity: 0.7, fontSize: 14 }}>
                    {l.sport.toUpperCase()} • {l.season} • {l.total_rosters} teams
                  </div>
                  <Link to={`/sleeper/league/${l.league_id}`}>Open dashboard →</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
