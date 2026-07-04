"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DollarSign,
  FolderGit2,
  LogOut,
  ScrollText,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/costs", label: "Costs", icon: DollarSign },
  { href: "/admin/teams", label: "Teams", icon: Users },
  { href: "/admin/invite", label: "Invite", icon: UserPlus },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="px-2 py-3">
        <Link href="/projects" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  active ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
            {session?.user?.email?.[0] ?? "?"}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {session?.user?.email ?? "—"}
          </span>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="glass fixed inset-y-0 left-0 hidden w-64 border-y-0 border-l-0 lg:block">
      <SidebarNav />
    </aside>
  );
}
