import { parseBoolean, parseDate } from "./utils";
import type { MemberWithRelations } from "./schemas";

// CSV column layout — single source of truth for both the import template
// and the export. Order matches the public registration form at /register.
export const CSV_HEADERS = [
  "Email address",
  "Last name, First name Middle name",
  "Employee ID number (ARTA ID number)",
  "Current Address",
  "Permanent Address",
  "Contact Number",
  "Birthdate",
  "Sex",
  "Civil Status",
  "Religion",
  "Sector",
  "IP Affiliation",
  "Chapter Base",
  "Division",
  "Position (Please do not abbreviate)",
  "Status of Employment",
  "Employee Status",
  "With Physical HMO card",
  "Name of HMO",
  "Policy / Card number of HMO",
  "Have you claimed burial assistance from previous years?",
  // Dependents A.1 - A.4 (name, relationship, status)
  "A.1. Name of Declared Dependent", "Relationship to dependent A.1", "Dependent Status A.1",
  "A.2. Name of Declared Dependent", "Relationship to dependent A.2", "Dependent Status A.2",
  "A.3. Name of Declared Dependent", "Relationship to dependent A.3", "Dependent Status A.3",
  "A.4. Name of Declared Dependent", "Relationship to dependent A.4", "Dependent Status A.4",
  // Claimants B.1 - B.4 (name, relationship)
  "B.1. Name of Declared Claimant", "Relationship to Claimant B.1",
  "B.2. Name of Declared Claimant", "Relationship to Claimant B.2",
  "B.3. Name of Declared Claimant", "Relationship to Claimant B.3",
  "B.4. Name of Declared Claimant", "Relationship to Claimant B.4",
  "Emergency Contact: Name of Contact Person",
  "Emergency Contact: Contact Number",
  "Emergency Contact: Relationship to staff",
  "Consent Notice"
] as const;

// Kept as named re-exports for callers that import the export-specific symbols.
export const EXPORT_HEADERS = CSV_HEADERS;

const IDX = {
  email: 0,
  name: 1,
  empNo: 2,
  currAddr: 3,
  permAddr: 4,
  contact: 5,
  birthdate: 6,
  sex: 7,
  civilStatus: 8,
  religion: 9,
  sector: 10,
  ipAffil: 11,
  chapter: 12,
  division: 13,
  position: 14,
  statusOfEmployment: 15,
  employeeStatus: 16,
  hasHmo: 17,
  hmoName: 18,
  hmoPolicy: 19,
  claimedBurial: 20,
  dep1: 21, dep2: 24, dep3: 27, dep4: 30,
  cla1: 33, cla2: 35, cla3: 37, cla4: 39,
  emName: 41, emPhone: 42, emRel: 43,
  consent: 44
} as const;

function depBlock(row: string[], start: number) {
  return {
    name: row[start] || null,
    relationship: row[start + 1] || null,
    status: row[start + 2] || null
  };
}

function claBlock(row: string[], start: number) {
  return {
    name: row[start] || null,
    relationship: row[start + 1] || null
  };
}

function parseEmployeeStatus(v: string | undefined): "active" | "separated" | "deceased" {
  const norm = (v || "").trim().toLowerCase();
  return norm === "separated" || norm === "deceased" ? norm : "active";
}

export function rowToMember(row: string[]): MemberWithRelations | null {
  const employee_number = (row[IDX.empNo] || "").trim();
  const full_name = (row[IDX.name] || "").trim();
  if (!employee_number || !full_name) return null;
  if (!/\d/.test(employee_number)) return null;

  const dependents = [IDX.dep1, IDX.dep2, IDX.dep3, IDX.dep4]
    .map((s, i) => ({ slot: i + 1, ...depBlock(row, s) }))
    .filter(d => d.name && d.name.trim());

  const claimants = [IDX.cla1, IDX.cla2, IDX.cla3, IDX.cla4]
    .map((s, i) => ({ slot: i + 1, ...claBlock(row, s) }))
    .filter(c => c.name && c.name.trim());

  return {
    employee_number,
    full_name,
    email_address: row[IDX.email] || null,
    permanent_address: row[IDX.permAddr] || null,
    current_address: row[IDX.currAddr] || null,
    contact_number: row[IDX.contact] || null,
    birthdate: parseDate(row[IDX.birthdate]),
    sex: row[IDX.sex] || null,
    civil_status: row[IDX.civilStatus] || null,
    religion: row[IDX.religion] || null,
    sector: row[IDX.sector] || null,
    ip_affiliation: row[IDX.ipAffil] || null,
    chapter_base: row[IDX.chapter] || null,
    division: row[IDX.division] || null,
    position: row[IDX.position] || null,
    status_of_employment: row[IDX.statusOfEmployment] || null,
    employee_status: parseEmployeeStatus(row[IDX.employeeStatus]),
    has_physical_inlife_card: parseBoolean(row[IDX.hasHmo]),
    hmo_name: row[IDX.hmoName] || null,
    inlife_id_number: row[IDX.hmoPolicy] || null,
    claimed_burial_assistance: parseBoolean(row[IDX.claimedBurial]),
    emergency_contact_name: row[IDX.emName] || null,
    emergency_contact_number: row[IDX.emPhone] || null,
    emergency_contact_relationship: row[IDX.emRel] || null,
    consent_signed: !!(row[IDX.consent] && row[IDX.consent].trim()),
    consent_text: row[IDX.consent] || null,
    dependents,
    claimants
  };
}

export function memberToRow(m: MemberWithRelations): (string | null)[] {
  const row: (string | null)[] = new Array(CSV_HEADERS.length).fill("");
  row[IDX.email] = m.email_address ?? "";
  row[IDX.name] = m.full_name;
  row[IDX.empNo] = m.employee_number;
  row[IDX.currAddr] = m.current_address ?? "";
  row[IDX.permAddr] = m.permanent_address ?? "";
  row[IDX.contact] = m.contact_number ?? "";
  row[IDX.birthdate] = m.birthdate ?? "";
  row[IDX.sex] = m.sex ?? "";
  row[IDX.civilStatus] = m.civil_status ?? "";
  row[IDX.religion] = m.religion ?? "";
  row[IDX.sector] = m.sector ?? "";
  row[IDX.ipAffil] = m.ip_affiliation ?? "";
  row[IDX.chapter] = m.chapter_base ?? "";
  row[IDX.division] = m.division ?? "";
  row[IDX.position] = m.position ?? "";
  row[IDX.statusOfEmployment] = m.status_of_employment ?? "";
  row[IDX.employeeStatus] = m.employee_status ?? "active";
  row[IDX.hasHmo] = m.has_physical_inlife_card == null ? "" : m.has_physical_inlife_card ? "Yes" : "No";
  row[IDX.hmoName] = m.hmo_name ?? "";
  row[IDX.hmoPolicy] = m.inlife_id_number ?? "";
  row[IDX.claimedBurial] = m.claimed_burial_assistance == null ? "" : m.claimed_burial_assistance ? "Yes" : "No";

  const depStarts = [IDX.dep1, IDX.dep2, IDX.dep3, IDX.dep4];
  for (let i = 0; i < 4; i++) {
    const d = m.dependents.find(x => x.slot === i + 1);
    const s = depStarts[i];
    row[s]     = d?.name ?? "";
    row[s + 1] = d?.relationship ?? "";
    row[s + 2] = d?.status ?? "";
  }
  const claStarts = [IDX.cla1, IDX.cla2, IDX.cla3, IDX.cla4];
  for (let i = 0; i < 4; i++) {
    const c = m.claimants.find(x => x.slot === i + 1);
    const s = claStarts[i];
    row[s]     = c?.name ?? "";
    row[s + 1] = c?.relationship ?? "";
  }
  row[IDX.emName] = m.emergency_contact_name ?? "";
  row[IDX.emPhone] = m.emergency_contact_number ?? "";
  row[IDX.emRel] = m.emergency_contact_relationship ?? "";
  row[IDX.consent] = m.consent_text ?? (m.consent_signed ? "Yes" : "");
  return row;
}

// Alias for the export route. Same 45-column layout as the import template.
export const memberToExportRow = memberToRow;
