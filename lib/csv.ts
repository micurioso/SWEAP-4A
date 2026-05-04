import { parseBoolean, parseDate } from "./utils";
import type { MemberWithRelations } from "./schemas";

// Header keys for the import template. Timestamp is omitted intentionally.
export const CSV_HEADERS = [
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

const IDX = {
  email: 0,
  name: 1,
  empNo: 2,
  permAddr: 3,
  currAddr: 4,
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
  empStatus: 15,
  hasInlife: 16,
  inlifeId: 17,
  noInlifeReason: 18,
  claimedBurial: 19,
  dep1: 20, dep2: 26, dep3: 32, dep4: 38,
  cla1: 44, cla2: 46, cla3: 48, cla4: 50,
  emName: 52, emPhone: 53, emRel: 54,
  consent: 55
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

export const EXPORT_HEADERS = [
  "Email Address",
  "Name of Staff",
  "Employee Number",
  "Permanent Address",
  "Current Address",
  "Contact Number",
  "Birthdate",
  "Sex",
  "Civil Status",
  "Religion",
  "Sector",
  "IP Affiliation",
  "Chapter Base",
  "Division",
  "Position",
  "Status of employment",
  "A.1. Name of Declared Dependent (no.1)", "Relationship", "Dependent Status",
  "A.2. Name of Declared Dependent (no.2)", "Relationship", "Dependent Status",
  "A.3. Name of Declared Dependent (no.3)", "Relationship", "Dependent Status",
  "A.4. Name of Declared Dependent (no.4)", "Relationship", "Dependent Status",
  "B.1. Name of Declared Claimant (no.1)", "Relationship",
  "B.2. Name of Declared Claimant (no.2)", "Relationship",
  "B.3. Name of Declared Claimant (no.3)", "Relationship",
  "B.4. Name of Declared Claimant (no.4)", "Relationship",
  "Name of contact person", "Contact number/s", "Relationship",
  "Consent Notice"
] as const;

export function memberToExportRow(m: MemberWithRelations): (string | null)[] {
  const row: (string | null)[] = new Array(EXPORT_HEADERS.length).fill("");
  let i = 0;
  row[i++] = m.email_address ?? "";
  row[i++] = m.full_name;
  row[i++] = m.employee_number;
  row[i++] = m.permanent_address ?? "";
  row[i++] = m.current_address ?? "";
  row[i++] = m.contact_number ?? "";
  row[i++] = m.birthdate ?? "";
  row[i++] = m.sex ?? "";
  row[i++] = m.civil_status ?? "";
  row[i++] = m.religion ?? "";
  row[i++] = m.sector ?? "";
  row[i++] = m.ip_affiliation ?? "";
  row[i++] = m.chapter_base ?? "";
  row[i++] = m.division ?? "";
  row[i++] = m.position ?? "";
  row[i++] = m.status_of_employment ?? "";
  for (let s = 1; s <= 4; s++) {
    const d = m.dependents.find(x => x.slot === s);
    row[i++] = d?.name ?? "";
    row[i++] = d?.relationship ?? "";
    row[i++] = d?.status ?? "";
  }
  for (let s = 1; s <= 4; s++) {
    const c = m.claimants.find(x => x.slot === s);
    row[i++] = c?.name ?? "";
    row[i++] = c?.relationship ?? "";
  }
  row[i++] = m.emergency_contact_name ?? "";
  row[i++] = m.emergency_contact_number ?? "";
  row[i++] = m.emergency_contact_relationship ?? "";
  row[i++] = m.consent_text ?? (m.consent_signed ? "Yes" : "");
  return row;
}

export function memberToRow(m: MemberWithRelations): (string | null)[] {
  const row: (string | null)[] = new Array(CSV_HEADERS.length).fill("");
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
