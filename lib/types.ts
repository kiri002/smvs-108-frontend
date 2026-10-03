// Shapes returned by the SMVS 108 API (only the fields the UI uses).

export type Labelled = { labelEn: string; labelGu: string };
export type Coded = Labelled & { id: number; code: string };

export type Permission = { module: string; action: string; scope: "ALL" | "ZONE" | "TEAM" | "OWN" };

export type Me = {
  id: number;
  name: string;
  mobile: string;
  language: string;
  roleId: number;
  roleCode: string;
  roleLabel: string;
  homeScreen: string;
  teamId: number | null;
  zoneId: number | null;
  permissions: Permission[];
};

export type Zone = Coded & { color: string; sortOrder: number };
export type Location = Coded & { zoneId: number; locationTypeId: number | null; landmark: string };
export type Priority = Coded & { rank: number; color: string; dispatchTargetMin: number; arriveTargetMin: number; resolveTargetMin: number };
export type IssueType = Coded & { categoryId: number | null; defaultPriorityId: number; defaultMembers: number };
export type FormField = Coded & { issueTypeId: number | null; fieldType: "TEXT" | "NUMBER" | "BOOLEAN" | "CHOICE"; options: string; required: boolean };
export type Department = Coded;
export type Liaison = { id: number; code: string; name: string; departmentId: number; mobile: string; backupMobile: string };
export type TeamStatus = Coded & { meaning: string; dispatchable: boolean; countsAsReserve: boolean; color: string };
export type RequestStatus = Coded & { meaning: string; behaviour: string; color: string; countsInSla?: boolean };
export type ListValue = Coded & { listName: string };
export type TeamLite = Coded & { homeZoneId: number; standbyPointId: number | null; isReserve: boolean; minMembers: number; maxMembers: number; leaderUserId: number | null; deputyUserId: number | null };
export type Shift = Coded & { startTime: string; endTime: string };
export type Position = Coded & { kind: "LEADER" | "DEPUTY" | "MEMBER"; minCount: number; maxCount: number };

export type Settings = {
  duplicateWindowMin: number;
  timerAmberPct: number;
  allowCrossZoneDispatch: boolean;
  drillMode: boolean;
  defaultLanguage: string;
  requirePhotoOnResolve: boolean;
  backEntryMaxHours: number;
  offlineTapMaxHours: number;
};

export type Lookups = {
  event: { id: number; code: string; name: string; status: string; timezone: string } | null;
  zones: Zone[];
  locations: Location[];
  standbyPoints: (Coded & { zoneId: number })[];
  departments: Department[];
  liaisons: Liaison[];
  shifts: Shift[];
  teams: TeamLite[];
  positions: Position[];
  priorities: Priority[];
  issueTypes: IssueType[];
  issueCategories: Coded[];
  formFields: FormField[];
  requestStatuses: RequestStatus[];
  assignmentStatuses: (Coded & { meaning: string; requiredFields: string; color: string })[];
  teamStatuses: TeamStatus[];
  listValues: ListValue[];
  settings: Settings;
  reservePolicy: { minPct: number; maxPct: number; approverRoleId: number | null; urgentWithoutApproval: boolean } | null;
  roles: (Coded & { homeScreen: string; isSystem: boolean })[];
};

export type StatusChip = Labelled & { code: string; meaning: string; color: string; behaviour?: string };

export type BoardAssignment = {
  id: number;
  membersSent: number;
  assignedAt: string;
  arrivedAt: string | null;
  workingAt: string | null;
  releasedAt: string | null;
  viaReserve: boolean;
  team: Coded;
  status: StatusChip;
};

export type BoardRequest = {
  id: number;
  code: string;
  number: number;
  status: StatusChip & { id: number; behaviour: string };
  priority: Priority;
  zone: Zone;
  location: Coded | null;
  issueType: Coded;
  department: (Labelled & { id: number }) | null;
  landmark: string;
  description: string;
  callerName: string;
  callerMobile: string;
  contactName: string;
  contactMobile: string;
  membersNeeded: number;
  requestedAt: string;
  dispatchedAt: string | null;
  arrivedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  isDrill: boolean;
  isBackEntry: boolean;
  selfRaised: boolean;
  assignments: BoardAssignment[];
  manpower: { id: number; membersAsked: number; at: string }[];
  reserveReleases: { id: number; teamId: number }[];
};

export type Board = { serverNow: string; timerAmberPct: number; drillMode: boolean; requests: BoardRequest[] };

export type ReserveIndicator = { reserveOnDuty: number; totalOnDuty: number; pct: number | null; minPct: number; maxPct: number; state: "LOW" | "OK" | "HIGH" | "UNKNOWN" };

export type BoardTeam = Coded & {
  isReserve: boolean;
  minMembers: number;
  maxMembers: number;
  homeZone: Zone;
  standbyPoint: Coded | null;
  status: TeamStatus | null;
  statusChangedAt: string;
  membersOnDuty: number;
  leader: { id: number; name: string; mobile: string } | null;
  deputy: { id: number; name: string; mobile: string } | null;
  assignments: { id: number; assignedAt: string; status: StatusChip; request: { id: number; code: string; isDrill: boolean; priority: Priority; location: Labelled | null; zone: { code: string }; issueType: Labelled } }[];
};

export type TeamBoard = { serverNow: string; reserve: ReserveIndicator; teams: BoardTeam[] };

export type HistoryRow = { id: number; action: string; fromLabel: string; toLabel: string; detail: string; by: string; onBehalf: boolean; at: string; assignmentId: number | null };

export type DetailAssignment = BoardAssignment & {
  actionTaken: string;
  headcount: number | null;
  assignedBy: string;
  leader: { name: string; mobile: string } | null;
  deputy: { name: string; mobile: string } | null;
  overrideReason: ListValue | null;
  recallReason: ListValue | null;
  status: StatusChip & { requiredFields: string };
};

export type RequestDetail = Omit<BoardRequest, "assignments" | "manpower"> & {
  extraFieldsLabelled: (Labelled & { code: string; fieldType: string; value: string | number | boolean | null })[];
  liaison: { id: number; name: string; mobile: string } | null;
  createdBy: string;
  closedBy: string;
  reason: ListValue | null;
  reasonNote: string;
  mergedInto: { id: number; code: string } | null;
  merged: { id: number; code: string }[];
  history: HistoryRow[];
  notes: { id: number; text: string; assignmentId: number | null; attachmentId: number | null; by: string; at: string }[];
  manpower: { id: number; membersAsked: number; note: string; by: string; at: string; handledAt: string | null; assignmentId: number }[];
  assignments: DetailAssignment[];
  allowedTransitions: (Labelled & { toStatusId: number; code: string; meaning: string; color: string; requiredFields: string[] })[];
  serverNow: string;
  timerAmberPct: number;
  extraFields: Record<string, unknown>;
  locationId: number | null;
  zoneId: number;
  issueTypeId: number;
  priorityId: number;
  departmentId: number | null;
  liaisonId: number | null;
};

export type Suggestion = {
  teamId: number;
  code: string;
  labelEn: string;
  labelGu: string;
  homeZone: { id: number; code: string; labelEn: string };
  status: (Labelled & { id: number; code: string; color: string }) | null;
  tier: "ZONE" | "NEIGHBOUR" | "RESERVE" | "OTHER";
  rank: number | null;
  travelMin: number | null;
  reason: string;
  reasonKey: string;
  reasonParams: Record<string, string | number>;
  membersOnDuty: number;
  membersEstimated: boolean;
  needsApproval: boolean;
  requiresOverride: boolean;
  preselected: boolean;
};

export type SuggestionPlan = {
  requestId: number;
  membersNeeded: number;
  membersSent: number;
  remainingGap: number;
  urgent: boolean;
  suggestions: Suggestion[];
  unavailable: { teamId: number; code: string; status: (Labelled & { code: string; color: string }) | null; alreadyOnThisRequest: boolean }[];
};

export type MyJob = {
  id: number;
  status: StatusChip & { requiredFields: string };
  membersSent: number;
  assignedAt: string;
  arrivedAt: string | null;
  workingAt: string | null;
  releasedAt: string | null;
  actionTaken: string;
  headcount: number | null;
  notes: { id: number; text: string; attachmentId: number | null; at: string }[];
  request: {
    id: number;
    code: string;
    isDrill: boolean;
    priority: Labelled & { color: string; rank: number; arriveTargetMin: number; resolveTargetMin: number };
    issueType: Labelled & { id: number };
    location: (Labelled & { landmark: string; latitude: number | null; longitude: number | null }) | null;
    landmark: string;
    zone: Labelled & { code: string };
    status: Labelled & { meaning: string };
    membersNeeded: number;
    description: string;
    callerName: string;
    callerMobile: string;
    contactName: string;
    contactMobile: string;
    requestedAt: string;
    extra: (Labelled & { code: string; value: unknown })[];
  };
};

export type MyAssignments = {
  team: (Coded & { status: TeamStatus | null; homeZone: Labelled & { code: string }; standbyPoint: Labelled | null; isLeader: boolean; isDeputy: boolean }) | null;
  statuses?: TeamStatus[];
  serverNow?: string;
  active: MyJob[];
  recent: MyJob[];
};

export type Alert = { id: number; type: string; title: string; body: string; link: string; createdAt: string; readAt: string | null };

export type ReserveRelease = {
  id: number;
  decision: "PENDING" | "APPROVED" | "REJECTED" | "AUTO";
  membersSent: number;
  note: string;
  requestedAt: string;
  decidedAt: string | null;
  requestedBy: string;
  decidedBy: string | null;
  team: Coded;
  request: { id: number; code: string; priority: Labelled & { color: string }; issueType: Labelled; location: Labelled | null; zone: { code: string } };
};
