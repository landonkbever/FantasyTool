import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import SleeperConnect from "./pages/SleeperConnect";
import SleeperLeague from "./pages/SleeperLeague";

export default function App() {
  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link to="/" style={{ fontWeight: 700 }}>
          Fantasy Tools
        </Link>
        <div style={{ opacity: 0.6 }}>Local dev</div>
      </header>

      <div style={{ height: 16 }} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/connect/sleeper" element={<SleeperConnect />} />
        <Route path="/sleeper/league/:leagueId" element={<SleeperLeague />} />
      </Routes>
    </div>
  );
}
