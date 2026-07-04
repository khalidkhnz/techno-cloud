import Link from "next/link";
import { env } from "../env";

export default function Home() {
  return (
    <main className="container-app">
      <div className="card max-w-xl">
        <h1>Techno-Deployer</h1>
        <p className="mt-2">Internal PaaS — connect a repo, deploy to AWS (Lambda, Amplify, and more).</p>
        <div className="mt-4">
          <Link href="/projects" className="btn">
            Open dashboard →
          </Link>
        </div>
        <p className="muted mt-4">API: {env.NEXT_PUBLIC_API_URL}</p>
      </div>
    </main>
  );
}
