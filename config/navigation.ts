import { BarChart3, ClipboardList, LayoutDashboard, PhoneCall, Settings2, Siren, Users, type LucideIcon } from "lucide-react";

import type { MessageKey } from "@/lib/i18n";
import type { Me } from "@/lib/types";

type Can = (module: string, action: string) => string | null;

export type NavItem = {
  titleKey: MessageKey;
  url: string;
  icon: LucideIcon;
  /** Shown only when this returns true for the signed-in user. */
  visible: (can: Can, user: Me) => boolean;
};

// Sidebar menu. Add new top-level pages here; visibility follows the permission matrix.
// Alerts live in the header bell; roster, attendance and reserve approvals were removed (Nov 2026).
export const navItems: NavItem[] = [
  // Campus-wide screens: only roles that see everything (Admin, Control Room). Team roles work from My assignment.
  { titleKey: "nav.controlRoom", url: "/control-room", icon: LayoutDashboard, visible: (can) => can("TRACKING", "VIEW") === "ALL" },
  { titleKey: "nav.newRequest", url: "/requests/new", icon: PhoneCall, visible: (can) => !!can("INTAKE", "CREATE") },
  { titleKey: "nav.myAssignment", url: "/my-assignment", icon: Siren, visible: (_can, user) => !!user.teamId },
  { titleKey: "nav.requests", url: "/requests", icon: ClipboardList, visible: (can) => can("TRACKING", "VIEW") === "ALL" },
  { titleKey: "nav.teams", url: "/teams", icon: Users, visible: (can) => !!can("TEAMS", "VIEW") },
  { titleKey: "nav.reports", url: "/reports", icon: BarChart3, visible: (can) => !!can("REPORTS", "VIEW") },
  { titleKey: "nav.admin", url: "/admin", icon: Settings2, visible: (can) => !!can("CONFIG", "VIEW") || !!can("USERS", "CONFIGURE") },
];
