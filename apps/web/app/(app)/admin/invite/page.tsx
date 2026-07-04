"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInvite } from "@/lib/query/admin";
import { useMeta } from "@/lib/query/meta";

const DEFAULT_TEAM = "00000000-0000-0000-0000-000000000000";

export default function InviteUserPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");
  const invite = useCreateInvite();
  const { data: meta } = useMeta();
  const roles = meta?.roles ?? ["owner", "admin", "developer", "viewer"];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    invite.mutate({ email, teamId: DEFAULT_TEAM, role }, { onSuccess: () => setEmail("") });
  }

  return (
    <FadeIn>
      <PageHeader title="Invite a user" description="Send an invite-only sign-in link." />

      <div className="glass max-w-md rounded-2xl p-6">
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="inv-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="inv-email"
                type="email"
                className="pl-9"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="glow" disabled={invite.isPending}>
            <Send className="h-4 w-4" /> {invite.isPending ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </div>
    </FadeIn>
  );
}
