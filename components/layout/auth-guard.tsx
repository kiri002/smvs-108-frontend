"use client";

import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { Loading } from "@/components/common/states";
import { useAuth } from "@/lib/auth";

/** Sends signed-out users to /login and keeps the page they wanted. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) return <Loading className="min-h-screen justify-center" />;
  return <>{children}</>;
}
