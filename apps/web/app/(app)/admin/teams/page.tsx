"use client";

import { useState } from "react";
import { Plus, Settings2, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddMember,
  useCreateTeam,
  useMembers,
  useRemoveMember,
  useTeams,
  useUpdateMemberRole,
} from "@/lib/query/teams";

const ROLES = ["owner", "admin", "developer", "viewer"];

export default function TeamsPage() {
  const { data: teams } = useTeams();
  const [selected, setSelected] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const createTeam = useCreateTeam();

  return (
    <FadeIn>
      <PageHeader title="Teams" description="Membership and roles across the platform." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Your teams</h2>
          <div className="glass overflow-hidden rounded-xl">
            <ul className="divide-y divide-white/[0.06]">
              {(teams ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <Button
                    variant={selected === t.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setSelected(t.id)}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> Manage
                  </Button>
                </li>
              ))}
              {(!teams || teams.length === 0) && (
                <li className="px-4 py-2.5 text-sm text-muted-foreground">No teams.</li>
              )}
            </ul>
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createTeam.mutate(teamName, { onSuccess: () => setTeamName("") });
            }}
          >
            <Input
              placeholder="new team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
            <Button type="submit" size="sm" disabled={createTeam.isPending}>
              <Plus className="h-3.5 w-3.5" /> Create
            </Button>
          </form>
        </div>

        {selected ? (
          <MembersPanel teamId={selected} />
        ) : (
          <EmptyState icon={Users} title="Select a team" description="Manage members and their roles." />
        )}
      </div>
    </FadeIn>
  );
}

function MembersPanel({ teamId }: { teamId: string }) {
  const { data: members } = useMembers(teamId);
  const add = useAddMember(teamId);
  const remove = useRemoveMember(teamId);
  const updateRole = useUpdateMemberRole(teamId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Members</h2>
      <div className="glass overflow-hidden rounded-xl">
        <ul className="divide-y divide-white/[0.06]">
          {(members ?? []).map((m) => (
            <li key={m.userId} className="flex items-center gap-2 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">{m.email}</span>
              <Select
                value={m.role}
                onValueChange={(r) => updateRole.mutate({ userId: m.userId, role: r })}
              >
                <SelectTrigger className="h-7 w-[7.5rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:text-red-300"
                onClick={() => remove.mutate(m.userId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
          {(!members || members.length === 0) && (
            <li className="px-4 py-2.5 text-sm text-muted-foreground">No members.</li>
          )}
        </ul>
      </div>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate({ email, role }, { onSuccess: () => setEmail("") });
        }}
      >
        <Input
          className="max-w-[14rem]"
          type="email"
          placeholder="member email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="max-w-[8rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={add.isPending}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </form>
    </div>
  );
}
