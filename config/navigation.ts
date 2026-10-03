import {
  BellRing,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  PhoneCall,
  Settings2,
  ShieldCheck,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";

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
export const navItems: NavItem[] = [
  { titleKey: "nav.controlRoom", url: "/control-room", icon: LayoutDashboard, visible: (can) => !!can("TRACKING", "VIEW") },
  { titleKey: "nav.newRequest", url: "/requests/new", icon: PhoneCall, visible: (can) => !!can("INTAKE", "CREATE") },
  { titleKey: "nav.myAssignment", url: "/my-assignment", icon: Siren, visible: (_can, user) => !!user.teamId },
  { titleKey: "nav.requests", url: "/requests", icon: ClipboardList, visible: (can) => !!can("TRACKING", "VIEW") },
  { titleKey: "nav.teams", url: "/teams", icon: Users, visible: (can) => !!can("TEAMS", "VIEW") },
  { titleKey: "nav.roster", url: "/teams/roster", icon: ListChecks, visible: (can) => !!can("TEAMS", "EDIT") },
  { titleKey: "nav.approvals", url: "/approvals", icon: ShieldCheck, visible: (can) => !!can("RESERVE", "APPROVE") },
  { titleKey: "nav.alerts", url: "/alerts", icon: BellRing, visible: () => true },
  { titleKey: "nav.admin", url: "/admin", icon: Settings2, visible: (can) => !!can("CONFIG", "VIEW") || !!can("USERS", "CONFIGURE") },
];
