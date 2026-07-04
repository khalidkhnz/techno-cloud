import Link from "next/link";
import { env } from "../env";

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "3rem", maxWidth: 720 }}>
      <h1>Techno-Deployer</h1>
      <p>Internal PaaS — connect a repo, deploy to AWS (Lambda, Amplify, and more).</p>
      <p>
        <Link href="/projects">→ Projects</Link>
      </p>
      <p style={{ color: "#999", fontSize: 12 }}>API: {env.NEXT_PUBLIC_API_URL}</p>
    </main>
  );
}
