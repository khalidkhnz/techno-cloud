"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

type Member = { userId: string; role: string; email: string; name: string | null };
const ROLES = ["owner", "admin", "developer", "viewer"];

export default function TeamsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [teamName, setTeamName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("developer");
  const [error, setError] = useState<string | null>(null);

  const loadTeams = () => api.listTeams().then(setTeams).catch((e) => setError(String(e)));
  const loadMembers = (t: string) => api.listMembers(t).then(setMembers).catch(() => setMembers([]));

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
      return;
    }
    if (session) loadTeams();
  }, [isPending, session, router]);

  useEffect(() => {
    if (selected) loadMembers(selected);
  }, [selected]);

  if (isPending || !session) return null;

  return (
    <main className="container-app">
      <Link href="/projects" className="text-sm">
        ← Projects
      </Link>
      <h1 className="mt-2">Teams</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <h2>Your teams</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{t.name}</span>
                <button className="btn btn-secondary" onClick={() => setSelected(t.id)}>
                  manage
                </button>
              </li>
            ))}
            {teams.length === 0 && <li className="muted px-4 py-2">No teams.</li>}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              api.createTeam(teamName).then(() => {
                setTeamName("");
                loadTeams();
              });
            }}
          >
            <input className="input" placeholder="new team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
            <button className="btn" type="submit">
              Create
            </button>
          </form>
        </div>

        {selected && (
          <div>
            <h2>Members</h2>
            <ul className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>
                    {m.email} <span className="badge bg-neutral-100 text-neutral-600">{m.role}</span>
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => api.removeMember(selected, m.userId).then(() => loadMembers(selected))}
                  >
                    remove
                  </button>
                </li>
              ))}
              {members.length === 0 && <li className="muted px-4 py-2">No members.</li>}
            </ul>
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                api.addMember(selected, memberEmail, memberRole).then(() => {
                  setMemberEmail("");
                  loadMembers(selected);
                });
              }}
            >
              <input className="input max-w-[14rem]" type="email" placeholder="member email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required />
              <select className="input max-w-[8rem]" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button className="btn" type="submit">
                Add
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
