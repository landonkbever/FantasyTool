import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <h1>Connect a platform</h1>
      <p>Start with Sleeper (no OAuth required).</p>

      <ul>
        <li>
          <Link to="/connect/sleeper">Connect Sleeper</Link>
        </li>
        <li style={{ opacity: 0.5 }}>Connect Yahoo (coming next)</li>
        <li style={{ opacity: 0.5 }}>Connect ESPN (coming next)</li>
      </ul>
    </div>
  );
}
