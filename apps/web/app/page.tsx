"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Logo } from "@/components/app/logo";
import { TargetBadge, TARGETS } from "@/components/app/target-badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

const ease = [0.22, 1, 0.36, 1] as const;

export default function SplashPage() {
  const { data: session } = useSession();
  const cta = session ? "/projects" : "/login";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col items-center"
      >
        <Logo showWord={false} className="scale-125" />

        <h1 className="mt-8 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-gradient sm:text-6xl">
          Deploy anything to AWS.
          <br />
          <span className="text-primary">Instantly.</span>
        </h1>

        <p className="mt-5 max-w-md text-pretty text-base text-muted-foreground">
          Connect any repo and ship it to Lambda, containers, or the edge — one internal control plane
          for every runtime.
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-2"
        >
          {Object.keys(TARGETS).map((t) => (
            <TargetBadge key={t} target={t} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-10"
        >
          <Button asChild size="lg" className="glow h-11 px-6 text-sm">
            <Link href={cta}>
              {session ? "Open dashboard" : "Sign in"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      <footer className="absolute bottom-6 text-xs text-zinc-600">
        Internal PaaS · techno-deployer
      </footer>
    </main>
  );
}
