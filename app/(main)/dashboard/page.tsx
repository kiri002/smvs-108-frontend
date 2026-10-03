"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Loading } from "@/components/common/states";
import { useAuth } from "@/lib/auth";

/** Sends each role to its configured home screen. */
export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (user) router.replace(user.homeScreen && user.homeScreen !== "/dashboard" ? user.homeScreen : "/control-room");
  }, [user, router]);
  return <Loading />;
}
