"use client";
import { useState } from "react";
import { Search, FileDown, Loader2 } from "lucide-react";

type Member = {
  employee_number: string;
  full_name: string;
  email_address?: string | null;
  contact_number?: string | null;
  birthdate?: string | null;
  sex?: string | null;
  civil_status?: string | null;
  religion?: string | null;
  sector?: string | null;
  ip_affiliation?: string | null;
  permanent_address?: string | null;
  current_address?: string | null;
  chapter_base?: string | null;
  division?: string | null;
  position?: string | null;
  status_of_employment?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relationship?: string | null;
};

type Dependent = { slot: number; name?: string | null; relationship?: string | null; status?: string | null };
type Claimant = { slot: number; name?: string | null; relationship?: string | null };
type ClaimantTo = { name: string; relationship: string };

const FIELDS: { key: keyof Member; label: string }[] = [
  { key: "full_name",                       label: "Full Name" },
  { key: "email_address",                   label: "Email Address" },
  { key: "contact_number",                  label: "Contact Number" },
  { key: "birthdate",                       label: "Birthdate (e.g. May 16, 2023)" },
  { key: "sex",                             label: "Sex" },
  { key: "civil_status",                    label: "Civil Status" },
  { key: "religion",                        label: "Religion" },
  { key: "sector",                          label: "Sector" },
  { key: "ip_affiliation",                  label: "IP Affiliation" },
  { key: "permanent_address",               label: "Permanent Address" },
  { key: "current_address",                 label: "Current Address" },
  { key: "chapter_base",                    label: "Chapter Base" },
  { key: "division",                        label: "Division" },
  { key: "position",                        label: "Position" },
  { key: "status_of_employment",            label: "Status of Employment" },
  { key: "emergency_contact_name",          label: "Emergency Contact Name" },
  { key: "emergency_contact_number",        label: "Emergency Contact Number" },
  { key: "emergency_contact_relationship",  label: "Emergency Contact Relationship" },
];

const EMPTY_CLAIMANT_TO: ClaimantTo = { name: "", relationship: "" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Format a stored date (usually "YYYY-MM-DD") as "Month D, YYYY" without timezone shifts.
function formatBirthdate(s?: string | null): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const month = MONTHS[Number(m[2]) - 1];
    if (month) return `${month} ${Number(m[3])}, ${m[1]}`;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function toBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function UpdateForm() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [claimants, setClaimants] = useState<Claimant[]>([]);
  const [toValues, setToValues] = useState<Record<string, string>>({});
  const [claimantTo, setClaimantTo] = useState<Record<number, ClaimantTo>>({});
  const [generating, setGenerating] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setMember(null);
    setToValues({});
    setClaimantTo({});
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(q)}`);
      if (res.status === 404) { setError("Member not found."); return; }
      if (!res.ok) { setError("Failed to load member data."); return; }
      const data = await res.json();
      setMember(data.member);
      setDependents(data.dependents);
      setClaimants(data.claimants);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function setClaimantField(slot: number, field: keyof ClaimantTo, value: string) {
    setClaimantTo((prev) => ({
      ...prev,
      [slot]: { ...(prev[slot] ?? EMPTY_CLAIMANT_TO), [field]: value },
    }));
  }

  async function generatePdf() {
    if (!member) return;
    setGenerating(true);
    try {
      const [pdfMakeModule, pdfFontsModule]: any[] = await Promise.all([
        import("pdfmake/build/pdfmake"),
        import("pdfmake/build/vfs_fonts")
      ]);
      const pdfMake: any = pdfMakeModule.default ?? pdfMakeModule;
      const fontVfs: any = pdfFontsModule.default ?? pdfFontsModule;
      if (typeof pdfMake.addVirtualFileSystem === "function") {
        pdfMake.addVirtualFileSystem(fontVfs);
      } else {
        pdfMake.vfs = fontVfs;
      }

      const logoBase64 = await toBase64("/sweap-logo.png");
      const today = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

      const F  = 7;    // body font
      const FH = 7;    // header font

      // Compact layout (dependents — read-only, tight)
      const tight = {
        hLineWidth: () => 0.8, vLineWidth: () => 0.8,
        hLineColor: () => "#64748b", vLineColor: () => "#64748b",
        paddingTop: () => 2, paddingBottom: () => 2,
        paddingLeft: () => 4, paddingRight: () => 4,
      };
      const tightGreen = { ...tight, hLineColor: () => "#10b981", vLineColor: () => "#10b981", paddingTop: () => 9, paddingBottom: () => 9 };

      // Writing-space layout (TO fields — handwritten)
      const writing = {
        hLineWidth: () => 0.8, vLineWidth: () => 0.8,
        hLineColor: () => "#64748b", vLineColor: () => "#64748b",
        paddingTop: () => 6, paddingBottom: () => 6,
        paddingLeft: () => 4, paddingRight: () => 4,
      };
      const writingPurple = { ...writing, hLineColor: () => "#8b5cf6", vLineColor: () => "#8b5cf6", paddingTop: () => 9, paddingBottom: () => 9 };

      const th  = (t: string, opts = {}) => ({ text: t, fontSize: FH, bold: true, color: "#fff", fillColor: "#1e40af", alignment: "center" as const, ...opts });
      const dth = (t: string) => ({ text: t, fontSize: FH, bold: true, color: "#fff", fillColor: "#065f46", alignment: "center" as const });
      const cth = (t: string) => ({ text: t, fontSize: FH, bold: true, color: "#fff", fillColor: "#6d28d9", alignment: "center" as const });

      // ── Main FROM/TO table — single column (FIELD | FROM | TO) ─
      // All 18 fields stacked vertically. TO ("*") absorbs the remaining
      // width for a wide handwriting column. May span two pages — that's fine.
      const mainWidths = [120, 160, "*"];

      const mainRows = FIELDS.map(({ key, label }, i) => {
        const fill = i % 2 === 0 ? "#f8fafc" : "#ffffff";
        const toFill = i % 2 === 0 ? "#eff6ff" : "#f0f9ff";
        const fromText = key === "birthdate" ? formatBirthdate(member.birthdate) : ((member[key] as string | null) ?? "");
        return [
          { text: label, fontSize: F, fillColor: fill, color: "#374151" },
          { text: fromText, fontSize: F, color: "#374151", fillColor: fill },
          { text: toValues[key] ?? "", fontSize: F, color: "#1d4ed8", fillColor: toFill },
        ];
      });

      // ── Dependents (read-only, compact) ────────────────────
      const depRows = [1, 2, 3, 4].map((slot) => {
        const d = dependents.find((x) => x.slot === slot);
        const fill = slot % 2 === 1 ? "#f0fdf4" : "#ffffff";
        return [
          { text: `A.${slot}`, fontSize: F, bold: true, fillColor: fill },
          { text: d?.name ?? "—", fontSize: F, fillColor: fill },
          { text: d?.relationship ?? "—", fontSize: F, fillColor: fill },
          { text: d?.status ?? "—", fontSize: F, fillColor: fill },
        ];
      });

      // ── Claimants (writing space for New Name/Rel) ──────────
      const claRows = [1, 2, 3, 4].map((slot) => {
        const c = claimants.find((x) => x.slot === slot);
        const to = claimantTo[slot] ?? EMPTY_CLAIMANT_TO;
        const fill = slot % 2 === 1 ? "#faf5ff" : "#ffffff";
        return [
          { text: `B.${slot}`, fontSize: F, bold: true, fillColor: fill },
          { text: c?.name ?? "—", fontSize: F, fillColor: fill },
          { text: c?.relationship ?? "—", fontSize: F, fillColor: fill },
          { text: to.name, fontSize: F, color: "#6d28d9", fillColor: fill },
          { text: to.relationship, fontSize: F, color: "#6d28d9", fillColor: fill },
        ];
      });

      // ── Header ──────────────────────────────────────────────
      const govStack = [
        { text: "Republic of the Philippines", fontSize: 6.5, color: "#374151" },
        { text: "Department of Social Welfare and Development", fontSize: 6.5, color: "#374151" },
        { text: "Field Office IV-A · CALABARZON", fontSize: 6.5, bold: true, color: "#374151" },
        { text: "SWEAP CALABARZON", fontSize: 7.5, bold: true, color: "#1e40af", margin: [0, 1, 0, 0] },
      ];
      const headerLeft = logoBase64
        ? { columns: [{ image: logoBase64, width: 32, height: 32, margin: [0, 0, 5, 0] }, { stack: govStack, margin: [0, 1, 0, 0] }], width: "*" }
        : { stack: govStack, width: "*" };

      const USABLE = 559;

      // ── Signature lines (manual handwriting) ─────────────────
      const sigLine = (w: number) => ({ canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: w, y2: 0, lineWidth: 0.5 }] });
      const sigBlock = (title: string, lineW: number) => ({
        stack: [
          { text: title, fontSize: 7.5, bold: true, color: "#374151", margin: [0, 10, 0, 34] },
          sigLine(lineW),
          { text: "Signature over Printed Name", fontSize: 6.5, color: "#374151", margin: [0, 2, 0, 0] },
          { ...sigLine(lineW), margin: [0, 26, 0, 0] },
          { text: "Date", fontSize: 6.5, color: "#374151", margin: [0, 2, 0, 0] },
        ],
        width: "50%",
      });

      const docDefinition = {
        pageSize: "A4" as const,
        pageMargins: [18, 18, 18, 22] as [number, number, number, number],
        defaultStyle: { lineHeight: 1 },
        footer: () => ({
          text: `Generated ${today}  ·  SWEAP CALABARZON`,
          fontSize: 6, color: "#9ca3af", alignment: "center" as const, margin: [18, 5, 18, 0],
        }),
        content: [
          // Header
          {
            columns: [
              headerLeft,
              { stack: [{ text: `Date: ${today}`, fontSize: 7, alignment: "right" as const, color: "#374151" }], width: "auto", margin: [0, 1, 0, 0] },
            ],
            margin: [0, 0, 0, 3],
          },
          { text: "MEMBER INFORMATION UPDATE FORM", fontSize: 11, bold: true, alignment: "center" as const },
          { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: USABLE, y2: 0, lineWidth: 0.8, lineColor: "#1e40af" }], margin: [0, 2, 0, 3] },
          {
            stack: [
              { text: `Employee No.: ${member.employee_number}`, fontSize: 7.5, bold: true },
              { text: `Name: ${member.full_name}`, fontSize: 7.5, bold: true, margin: [0, 1, 0, 0] },
            ],
            margin: [0, 0, 0, 4],
          },

          // Main FROM/TO table (single column: FIELD | FROM | TO)
          {
            table: {
              headerRows: 1,
              widths: mainWidths,
              body: [
                [th("FIELD"), th("FROM (Current Information)"), th("TO (Updated Information — write here)")],
                ...mainRows,
              ],
            },
            layout: writing,
          },

          // Declared Dependents
          { text: "DECLARED DEPENDENTS", fontSize: 7.5, bold: true, margin: [0, 5, 0, 1] },
          { text: "For reference only — changes to dependents are not processed through this form.", fontSize: 6, italics: true, color: "#6b7280", margin: [0, 0, 0, 2] },
          {
            table: {
              headerRows: 1,
              widths: [30, "*", 150, 95],
              body: [[dth("Slot"), dth("Name"), dth("Relationship"), dth("Status")], ...depRows],
            },
            layout: tightGreen,
          },

          // Declared Claimants
          { text: "DECLARED CLAIMANTS", fontSize: 7.5, bold: true, margin: [0, 5, 0, 2] },
          {
            table: {
              headerRows: 1,
              widths: [28, 95, 80, "*", "*"],
              body: [[cth("Slot"), cth("Current Name"), cth("Current Relationship"), cth("New Name  (Write here)"), cth("New Relationship  (Write here)")], ...claRows],
            },
            layout: writingPurple,
          },

          // Consent + Signatures — kept together, never split across pages
          {
            unbreakable: true,
            stack: [
              { text: "CONSENT", fontSize: 7.5, bold: true, margin: [0, 6, 0, 2] },
              {
                table: {
                  widths: ["*"],
                  body: [[{
                    stack: [
                      {
                        text: "I hereby consent to the collection and use of my personal information by DSWD FO IV-A SWEAP CALABARZON for purposes related to member benefits, burial assistance, and other lawful SWEAP activities, in accordance with the Data Privacy Act of 2012 (RA 10173).",
                        fontSize: 7, color: "#374151",
                      },
                      { text: "\nI have read and agree to the consent notice above. *", fontSize: 7, bold: true, color: "#374151", margin: [0, 4, 0, 0] },
                    ],
                    margin: [6, 5, 6, 8],
                  }]],
                },
                layout: {
                  hLineWidth: () => 0.5, vLineWidth: () => 0.5,
                  hLineColor: () => "#94a3b8", vLineColor: () => "#94a3b8",
                  paddingTop: () => 0, paddingBottom: () => 0,
                  paddingLeft: () => 0, paddingRight: () => 0,
                },
              },
              {
                margin: [0, 16, 0, 0],
                columns: [
                  sigBlock("Requesting Staff:", 262),
                  sigBlock("Received by / Authorized Signatory:", 262),
                ],
              },
            ],
          },
        ],
      };

      const safeName = member.full_name.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
      pdfMake.createPdf(docDefinition as any).download(`Update_Form_${member.employee_number}_${safeName}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Look Up Member</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Enter Employee Number"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {member && (
        <>
          {/* Member info + FROM/TO table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="font-mono text-xs text-slate-400">{member.employee_number}</div>
                <h2 className="text-lg font-semibold text-slate-800">{member.full_name}</h2>
                <p className="text-xs text-slate-500">
                  Fill in only the fields that need to be updated. Leave blank to indicate no change.
                </p>
              </div>
              <button
                onClick={generatePdf}
                disabled={generating}
                className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Generate PDF
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-600 text-white">
                    <th className="px-3 py-2 text-left font-medium w-[28%]">Field</th>
                    <th className="px-3 py-2 text-left font-medium w-[36%]">FROM (Current)</th>
                    <th className="px-3 py-2 text-left font-medium w-[36%]">TO (Updated)</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map(({ key, label }, i) => {
                    const isBirthdate = key === "birthdate";
                    const fromValue = isBirthdate ? formatBirthdate(member.birthdate) : member[key];
                    return (
                      <tr key={key} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                        <td className="px-3 py-1.5 font-medium text-slate-600">{label}</td>
                        <td className="px-3 py-1.5 text-slate-700">
                          {fromValue || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="text"
                            value={toValues[key] ?? ""}
                            onChange={(e) => setToValues((v) => ({ ...v, [key]: e.target.value }))}
                            placeholder="No change"
                            className="w-full rounded border border-slate-200 bg-blue-50 px-2 py-1 text-sm text-blue-800 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Declared Dependents (read-only) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Dependents</h2>
            <p className="mb-3 text-xs italic text-slate-400">
              For reference only — changes to dependents are not processed through this form.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-600 text-white">
                    <th className="w-[10%] px-3 py-2 text-left font-medium">Slot</th>
                    <th className="w-[38%] px-3 py-2 text-left font-medium">Name</th>
                    <th className="w-[28%] px-3 py-2 text-left font-medium">Relationship</th>
                    <th className="w-[24%] px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((slot) => {
                    const d = dependents.find((x) => x.slot === slot);
                    return (
                      <tr key={slot} className={slot % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                        <td className="px-3 py-1.5 font-mono text-xs text-slate-500">A.{slot}</td>
                        <td className="px-3 py-1.5 text-slate-700">{d?.name ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-1.5 text-slate-600">{d?.relationship ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-1.5 text-slate-600">{d?.status ?? <span className="text-slate-300">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Declared Claimants (editable) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Declared Claimants</h2>
            <p className="mb-3 text-xs text-slate-500">
              Enter updated claimant information in the TO columns. Leave blank for no change.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-600 text-white">
                    <th className="w-[6%] px-3 py-2 text-left font-medium" rowSpan={2}>Slot</th>
                    <th className="px-3 py-2 text-center font-medium" colSpan={2}>FROM (Current)</th>
                    <th className="px-3 py-2 text-center font-medium" colSpan={2}>TO (Updated)</th>
                  </tr>
                  <tr className="bg-brand-500 text-white">
                    <th className="w-[22%] px-3 py-1.5 text-left font-medium text-xs">Name</th>
                    <th className="w-[20%] px-3 py-1.5 text-left font-medium text-xs">Relationship</th>
                    <th className="w-[26%] px-3 py-1.5 text-left font-medium text-xs">Name</th>
                    <th className="w-[26%] px-3 py-1.5 text-left font-medium text-xs">Relationship</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((slot) => {
                    const c = claimants.find((x) => x.slot === slot);
                    const to = claimantTo[slot] ?? EMPTY_CLAIMANT_TO;
                    return (
                      <tr key={slot} className={slot % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                        <td className="px-3 py-1.5 font-mono text-xs text-slate-500">B.{slot}</td>
                        <td className="px-3 py-1.5 text-slate-700">{c?.name ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-1.5 text-slate-600">{c?.relationship ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-1">
                          <input
                            type="text"
                            value={to.name}
                            onChange={(e) => setClaimantField(slot, "name", e.target.value)}
                            placeholder="No change"
                            className="w-full rounded border border-slate-200 bg-blue-50 px-2 py-1 text-sm text-blue-800 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="text"
                            value={to.relationship}
                            onChange={(e) => setClaimantField(slot, "relationship", e.target.value)}
                            placeholder="No change"
                            className="w-full rounded border border-slate-200 bg-blue-50 px-2 py-1 text-sm text-blue-800 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
