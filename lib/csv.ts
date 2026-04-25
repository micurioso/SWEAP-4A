import { parseBoolean, parseDate, parseTimestamp } from "./utils";
import type { MemberWithRelations } from "./schemas";

// Header keys exactly as they appear in the Google Forms CSV export.
// Using a single source of truth for both import and export keeps the round-trip lossless.
export const CSV_HEADERS = [
  "Timestamp",
  "Email Address",
  "Name of Staff",
  "Employee Number",
  "Permanent Address",
  "Current Address",
  "Contact Number",
  "Birthdate",
  "Sex",
  "Civil Status [Married ]",
  "Religion [Catholic ]",
  "Sector",
  "IP Affiliation",
  "Chapter Base [Row 1]",
  "Division",
  "Position (Please do not abbreviate)",
  "Status of employment",
  "With Physical Inlife Card?",
  "If Yes, Physical Inlife ID number (See Inlife Card)",
  "If No Physical Inlife Card, Please provide reason",
  "Have you claimed burial assistance from previous years?",
  // Dependents A.1 - A.4
  "A.1. Name of Declared Dependent (no.1)", "Relationship", "Dependent Status", "Amount claimed ", "Check/voucher number", "Claimant",
  "A.2. Name of Declared Dependent (no.2)", "Relationship", "Dependent Status", "Amount claimed ", "Check/voucher number", "Claimant",
  "A.3. Name of Declared Dependent (no.3)", "Relationship", "Dependent Status", "Amount claimed ", "Check/voucher number", "Claimant",
  "A.4. Name of Declared Dependent (no.4)", "Relationship", "Dependent Status", "Amount claimed ", "Check/voucher number", "Claimant",
  // Claimants B.1 - B.4
  "B.1. Name of Declared Claimant (no.1)", "Relationship",
  "B.2. Name of Declared Claimant (no.2)", "Relationship",
  "B.3. Name of Declared Claimant (no.3)", "Relationship",
  "B.4. Name of Declared Claimant (no.4)", "Relationship",
  "Name of contact person", "Contact number/s", "Relationship",
  "Consent Notice"
] as const;

// Because some headers are repeated ("Relationship", "Claimant", etc.) we work positionally.
// Indexes correspond to the columns above.
const IDX = {
  timestamp: 0,
  email: 1,
  name: 2,
  empNo: 3,
  permAddr: 4,
  currAddr: 5,
  contact: 6,
  birthdate: 7,
  sex: 8,
  civilStatus: 9,
  religion: 10,
  sector: 11,
  ipAffil: 12,
  chapter: 13,
  division: 14,
  position: 15,
  empStatus: 16,
  hasInlife: 17,
  inlifeId: 18,
  noInlifeReason: 19,
  claimedBurial: 20,
  // Each dependent block is 6 columns starting at 21
  dep1: 21, dep2: 27, dep3: 33, dep4: 39,
  // Each claimant block is 2 columns starting at 45
  cla1: 45, cla2: 47, cla3: 49, cla4: 51,
  emName: 53, emPhone: 54, emRel: 55,
  consent: 56
} as const;

function depBlock(row: string[], start: number) {
  return {
    name: row[start] || null,
    relationship: row[start + 1] || null,
    status: row[start + 2] || null,
    amount_claimed: row[start + 3] || null,
    check_voucher_number: row[start + 4] || null,
    claimant_name: row[start + 5] || null
  };
}

function claBlock(row: string[], start: number) {
  return {
    name: row[start] || null,
    relationship: row[start + 1] || null
  };
}

export function rowToMember(row: string[]): MemberWithRelations | null {
  const employee_number = (row[IDX.empNo] || "").trim();
  const full_name = (row[IDX.name] || "").trim();
  if (!employee_number || !full_name) return null;

  const dependents = [IDX.dep1, IDX.dep2, IDX.dep3, IDX.dep4]
    .map((s, i) => ({ slot: i + 1, ...depBlock(row, s) }))
    .filter(d => d.name && d.name.trim());

  const claimants = [IDX.cla1, IDX.cla2, IDX.cla3, IDX.cla4]
    .map((s, i) => ({ slot: i + 1, ...claBlock(row, s) }))
    .filter(c => c.name && c.name.trim());

  return {
    employee_number,
    full_name,
    submission_timestamp: parseTimestamp(row[IDX.timestamp]),
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
    status_of_employment: row[IDX.empStatus] || null,
    has_physical_inlife_card: parseBoolean(row[IDX.hasInlife]),
    inlife_id_number: row[IDX.inlifeId] || null,
    no_inlife_card_reason: row[IDX.noInlifeReason] || null,
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
  row[IDX.timestamp] = m.submission_timestamp ?? "";
  row[IDX.email] = m.email_address ?? "";
  row[IDX.name] = m.full_name;
  row[IDX.empNo] = m.employee_number;
  row[IDX.permAddr] = m.permanent_address ?? "";
  row[IDX.currAddr] = m.current_address ?? "";
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
  row[IDX.empStatus] = m.status_of_employment ?? "";
  row[IDX.hasInlife] = m.has_physical_inlife_card == null ? "" : m.has_physical_inlife_card ? "Yes" : "No";
  row[IDX.inlifeId] = m.inlife_id_number ?? "";
  row[IDX.noInlifeReason] = m.no_inlife_card_reason ?? "";
  row[IDX.claimedBurial] = m.claimed_burial_assistance == null ? "" : m.claimed_burial_assistance ? "Yes" : "No";

  const depStarts = [IDX.dep1, IDX.dep2, IDX.dep3, IDX.dep4];
  for (let i = 0; i < 4; i++) {
    const d = m.dependents.find(x => x.slot === i + 1);
    const s = depStarts[i];
    row[s]     = d?.name ?? "";
    row[s + 1] = d?.relationship ?? "";
    row[s + 2] = d?.status ?? "";
    row[s + 3] = d?.amount_claimed ?? "";
    row[s + 4] = d?.check_voucher_number ?? "";
    row[s + 5] = d?.claimant_name ?? "";
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
