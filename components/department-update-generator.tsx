"use client";

import { useEffect, useState } from "react";
import { Building2, FileDown, Loader2, UsersRound } from "lucide-react";

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

type Dependent = {
  slot: number;
  name?: string | null;
  relationship?: string | null;
  status?: string | null;
};
type Claimant = {
  slot: number;
  name?: string | null;
  relationship?: string | null;
};
type MemberPacket = {
  member: Member;
  dependents: Dependent[];
  claimants: Claimant[];
};
type Department = { name: string; count: number };
type Chapter = { name: string; count: number };
type GenerationProgress = {
  percent: number;
  stage: string;
  detail: string;
};

const LOAD_BATCH_SIZE = 100;
const FORM_BUILD_BATCH_SIZE = 10;
const MAX_FORMS_PER_PDF = 500;

function yieldToBrowser() {
  return new Promise<void>(resolve => window.setTimeout(resolve, 0));
}

const FIELDS: Array<{ key: keyof Member; label: string }> = [
  { key: "full_name", label: "Full Name" },
  { key: "email_address", label: "Email Address" },
  { key: "contact_number", label: "Contact Number" },
  { key: "birthdate", label: "Birthdate" },
  { key: "sex", label: "Sex" },
  { key: "civil_status", label: "Civil Status" },
  { key: "religion", label: "Religion" },
  { key: "sector", label: "Sector" },
  { key: "ip_affiliation", label: "IP Affiliation" },
  { key: "permanent_address", label: "Permanent Address" },
  { key: "current_address", label: "Current Address" },
  { key: "chapter_base", label: "Chapter Base" },
  { key: "division", label: "Division / Department" },
  { key: "position", label: "Position" },
  { key: "status_of_employment", label: "Status of Employment" },
  { key: "emergency_contact_name", label: "Emergency Contact Name" },
  { key: "emergency_contact_number", label: "Emergency Contact Number" },
  { key: "emergency_contact_relationship", label: "Emergency Contact Relationship" }
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatBirthdate(value?: string | null) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const month = MONTHS[Number(match[2]) - 1];
    if (month) return `${month} ${Number(match[3])}, ${match[1]}`;
  }
  return value;
}

async function toBase64(url: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
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

function memberContent(packet: MemberPacket, logoBase64: string | null, today: string, startOnNewPage: boolean) {
  const { member, dependents, claimants } = packet;
  const bodyFont = 7;
  const headerFont = 7;
  const usableWidth = 559;

  const layout = {
    hLineWidth: () => 0.7,
    vLineWidth: () => 0.7,
    hLineColor: () => "#94a3b8",
    vLineColor: () => "#94a3b8",
    paddingTop: () => 4,
    paddingBottom: () => 4,
    paddingLeft: () => 4,
    paddingRight: () => 4
  };
  const compactLayout = {
    ...layout,
    paddingTop: () => 2.5,
    paddingBottom: () => 2.5
  };
  const headingCell = (text: string, color = "#1e40af") => ({
    text,
    fontSize: headerFont,
    bold: true,
    color: "#ffffff",
    fillColor: color,
    alignment: "center" as const
  });

  const mainRows = FIELDS.map(({ key, label }, index) => {
    const fill = index % 2 === 0 ? "#f8fafc" : "#ffffff";
    const current = key === "birthdate"
      ? formatBirthdate(member.birthdate)
      : String(member[key] ?? "");
    return [
      { text: label, fontSize: bodyFont, color: "#374151", fillColor: fill },
      { text: current, fontSize: bodyFont, color: "#374151", fillColor: fill },
      { text: "", fontSize: bodyFont, fillColor: index % 2 === 0 ? "#eff6ff" : "#f0f9ff" }
    ];
  });

  const dependentRows = [1, 2, 3, 4].map(slot => {
    const dependent = dependents.find(item => item.slot === slot);
    return [
      { text: `A.${slot}`, fontSize: bodyFont, bold: true },
      { text: dependent?.name ?? "—", fontSize: bodyFont },
      { text: dependent?.relationship ?? "—", fontSize: bodyFont },
      { text: dependent?.status ?? "—", fontSize: bodyFont }
    ];
  });

  const claimantRows = [1, 2, 3, 4].map(slot => {
    const claimant = claimants.find(item => item.slot === slot);
    return [
      { text: `B.${slot}`, fontSize: bodyFont, bold: true },
      { text: claimant?.name ?? "—", fontSize: bodyFont },
      { text: claimant?.relationship ?? "—", fontSize: bodyFont },
      { text: "", fontSize: bodyFont },
      { text: "", fontSize: bodyFont }
    ];
  });

  const agencyText = [
    { text: "Republic of the Philippines", fontSize: 6.5, color: "#374151" },
    { text: "Department of Social Welfare and Development", fontSize: 6.5, color: "#374151" },
    { text: "Field Office IV-A · CALABARZON", fontSize: 6.5, bold: true, color: "#374151" },
    { text: "SWEAP CALABARZON", fontSize: 7.5, bold: true, color: "#1e40af", margin: [0, 1, 0, 0] }
  ];
  const headerLeft = logoBase64
    ? {
        columns: [
          { image: logoBase64, width: 32, height: 32, margin: [0, 0, 5, 0] },
          { stack: agencyText, margin: [0, 1, 0, 0] }
        ],
        width: "*"
      }
    : { stack: agencyText, width: "*" };

  const signatureLine = (width: number) => ({
    canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: width, y2: 0, lineWidth: 0.5 }]
  });
  const signatureBlock = (title: string) => ({
    stack: [
      { text: title, fontSize: 7.5, bold: true, color: "#374151", margin: [0, 8, 0, 28] },
      signatureLine(262),
      { text: "Signature over Printed Name", fontSize: 6.5, color: "#374151", margin: [0, 2, 0, 0] },
      { ...signatureLine(262), margin: [0, 22, 0, 0] },
      { text: "Date", fontSize: 6.5, color: "#374151", margin: [0, 2, 0, 0] }
    ],
    width: "50%"
  });

  return [
    {
      columns: [
        headerLeft,
        { text: `Date: ${today}`, fontSize: 7, alignment: "right" as const, color: "#374151", width: "auto" }
      ],
      margin: [0, 0, 0, 3],
      ...(startOnNewPage ? { pageBreak: "before" as const } : {})
    },
    { text: "MEMBER INFORMATION UPDATE FORM", fontSize: 11, bold: true, alignment: "center" as const },
    {
      canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: usableWidth, y2: 0, lineWidth: 0.8, lineColor: "#1e40af" }],
      margin: [0, 2, 0, 3]
    },
    {
      columns: [
        {
          stack: [
            { text: `Employee No.: ${member.employee_number}`, fontSize: 7.5, bold: true },
            { text: `Name: ${member.full_name}`, fontSize: 7.5, bold: true, margin: [0, 1, 0, 0] }
          ]
        },
        {
          text: member.division ? `Division: ${member.division}` : "Division: Not specified",
          fontSize: 7,
          alignment: "right" as const,
          color: "#475569"
        }
      ],
      margin: [0, 0, 0, 4]
    },
    {
      table: {
        headerRows: 1,
        widths: [120, 160, "*"],
        body: [
          [headingCell("FIELD"), headingCell("FROM (Current Information)"), headingCell("TO (Updated Information — write here)")],
          ...mainRows
        ]
      },
      layout
    },
    { text: "DECLARED DEPENDENTS", fontSize: 7.5, bold: true, margin: [0, 5, 0, 2] },
    {
      table: {
        headerRows: 1,
        widths: [30, "*", 150, 95],
        body: [[headingCell("Slot", "#065f46"), headingCell("Name", "#065f46"), headingCell("Relationship", "#065f46"), headingCell("Status", "#065f46")], ...dependentRows]
      },
      layout: compactLayout
    },
    { text: "DECLARED CLAIMANTS", fontSize: 7.5, bold: true, margin: [0, 5, 0, 2] },
    {
      table: {
        headerRows: 1,
        widths: [28, 95, 80, "*", "*"],
        body: [[
          headingCell("Slot", "#6d28d9"),
          headingCell("Current Name", "#6d28d9"),
          headingCell("Current Relationship", "#6d28d9"),
          headingCell("New Name", "#6d28d9"),
          headingCell("New Relationship", "#6d28d9")
        ], ...claimantRows]
      },
      layout
    },
    {
      unbreakable: true,
      stack: [
        { text: "CONSENT", fontSize: 7.5, bold: true, margin: [0, 6, 0, 2] },
        {
          text: "I consent to the collection and use of my personal information by DSWD FO IV-A SWEAP CALABARZON for member benefits and other lawful SWEAP activities in accordance with the Data Privacy Act of 2012 (RA 10173).",
          fontSize: 7,
          color: "#374151",
          margin: [6, 4, 6, 4]
        },
        {
          columns: [
            signatureBlock("Requesting Staff:"),
            signatureBlock("Received by / Authorized Signatory:")
          ],
          margin: [0, 8, 0, 0]
        }
      ]
    }
  ];
}

export default function DepartmentUpdateGenerator() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [selectedPart, setSelectedPart] = useState(0);
  const [completedParts, setCompletedParts] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/members/departments", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load departments.");
        return response.json();
      })
      .then(result => {
        if (!cancelled) setDepartments(result.departments ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load departments. Please refresh the page.");
      })
      .finally(() => {
        if (!cancelled) setLoadingDepartments(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setChapters([]);
    setSelectedChapter("");
    setSelectedPart(0);
    setCompletedParts([]);
    if (!selected) {
      setLoadingChapters(false);
      return;
    }

    const controller = new AbortController();
    setLoadingChapters(true);
    const query = new URLSearchParams({ division: selected, chapters: "1" });
    void fetch(`/api/members/departments?${query.toString()}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async response => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? "Could not load chapters.");
        return result;
      })
      .then(result => setChapters(result.chapters ?? []))
      .catch(caught => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Could not load chapters.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingChapters(false);
      });

    return () => controller.abort();
  }, [selected]);

  const selectedDepartment = departments.find(department => department.name === selected);
  const selectedChapterInfo = chapters.find(chapter => chapter.name === selectedChapter);
  const selectedScopeCount = selectedChapterInfo?.count ?? selectedDepartment?.count ?? 0;
  const totalParts = selectedDepartment
    ? Math.max(1, Math.ceil(selectedScopeCount / MAX_FORMS_PER_PDF))
    : 1;
  const selectedPartStart = selectedPart * MAX_FORMS_PER_PDF;
  const selectedPartCount = selectedDepartment
    ? Math.max(0, Math.min(MAX_FORMS_PER_PDF, selectedScopeCount - selectedPartStart))
    : 0;

  async function generateDepartmentPdf() {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    setProgress({ percent: 2, stage: "Starting", detail: "Preparing the department request…" });

    try {
      const partIndex = selectedPart;
      const partStartOffset = partIndex * MAX_FORMS_PER_PDF;
      const packets: MemberPacket[] = [];
      let offset = partStartOffset;
      let scopeTotal = selectedScopeCount;
      let expectedForms = scopeTotal > 0
        ? Math.max(0, Math.min(MAX_FORMS_PER_PDF, scopeTotal - partStartOffset))
        : MAX_FORMS_PER_PDF;

      do {
        setProgress({
          percent: expectedForms > 0 ? Math.min(30, 5 + Math.round((packets.length / expectedForms) * 25)) : 5,
          stage: totalParts > 1 ? `Loading Part ${partIndex + 1} of ${totalParts}` : "Loading member records",
          detail: scopeTotal > 0
            ? `${packets.length.toLocaleString()} of ${expectedForms.toLocaleString()} members loaded for this PDF`
            : "Loading the first batch…"
        });
        await yieldToBrowser();

        const query = new URLSearchParams({
          division: selected,
          offset: String(offset),
          limit: String(LOAD_BATCH_SIZE)
        });
        if (selectedChapter) query.set("chapter", selectedChapter);
        const response = await fetch(`/api/members/departments?${query.toString()}`, {
          cache: "no-store"
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? "Could not load department members.");

        const batch = (result?.members ?? []) as MemberPacket[];
        packets.push(...batch);
        scopeTotal = Number(result?.total ?? scopeTotal ?? packets.length);
        expectedForms = Math.max(0, Math.min(MAX_FORMS_PER_PDF, scopeTotal - partStartOffset));
        offset += batch.length;

        setProgress({
          percent: expectedForms > 0 ? Math.min(30, 5 + Math.round((packets.length / expectedForms) * 25)) : 30,
          stage: totalParts > 1 ? `Loading Part ${partIndex + 1} of ${totalParts}` : "Loading member records",
          detail: `${packets.length.toLocaleString()} of ${expectedForms.toLocaleString()} members loaded for this PDF`
        });

        if (batch.length === 0 || packets.length >= expectedForms || batch.length < LOAD_BATCH_SIZE) break;
      } while (true);

      if (packets.length === 0) {
        throw new Error(selectedChapter
          ? "No members were found in this chapter."
          : "No members were found in this department.");
      }
      const actualTotalParts = Math.max(1, Math.ceil(scopeTotal / MAX_FORMS_PER_PDF));
      const partLabel = actualTotalParts > 1 ? `Part ${partIndex + 1} of ${actualTotalParts}` : null;
      const chapterLabel = selectedChapter ? `Chapter: ${selectedChapter}` : null;

      setProgress({ percent: 34, stage: "Loading PDF tools", detail: "Preparing fonts and document assets…" });
      await yieldToBrowser();

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
      const today = new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const content: any[] = [];
      for (let index = 0; index < packets.length; index += 1) {
        content.push(...memberContent(packets[index], logoBase64, today, index > 0));

        const completed = index + 1;
        if (completed % FORM_BUILD_BATCH_SIZE === 0 || completed === packets.length) {
          setProgress({
            percent: 38 + Math.round((completed / packets.length) * 37),
            stage: partLabel ? `Preparing ${partLabel}` : "Preparing personalized forms",
            detail: `${completed.toLocaleString()} of ${packets.length.toLocaleString()} forms prepared`
          });
          await yieldToBrowser();
        }
      }

      const definition = {
        pageSize: "A4" as const,
        pageMargins: [18, 18, 18, 22] as [number, number, number, number],
        defaultStyle: { lineHeight: 1 },
        footer: (currentPage: number, pageCount: number) => ({
          columns: [
            {
              text: `Generated ${today} · SWEAP CALABARZON${chapterLabel ? ` · ${chapterLabel}` : ""}${partLabel ? ` · ${partLabel}` : ""}`,
              alignment: "left" as const
            },
            { text: `Page ${currentPage} of ${pageCount}`, alignment: "right" as const }
          ],
          fontSize: 6,
          color: "#9ca3af",
          margin: [18, 5, 18, 0]
        }),
        content
      };

      const safeDepartment = selected.replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_") || "Department";
      const safeChapter = selectedChapter.replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
      const chapterSuffix = safeChapter ? `_Chapter_${safeChapter}` : "";
      const partSuffix = partLabel ? `_Part_${partIndex + 1}_of_${actualTotalParts}` : "";
      setProgress({
        percent: 78,
        stage: partLabel ? `Building ${partLabel}` : "Building the PDF file",
        detail: `Rendering ${packets.length.toLocaleString()} forms. Keep this tab open—this is the longest step.`
      });
      await yieldToBrowser();

      await pdfMake.createPdf(definition as any).download(`Update_Forms_${safeDepartment}${chapterSuffix}${partSuffix}.pdf`);
      setProgress({
        percent: 100,
        stage: "Download ready",
        detail: `${packets.length.toLocaleString()} forms were added${partLabel ? ` to ${partLabel}` : " to the PDF"}.`
      });
      setCompletedParts(previous => previous.includes(partIndex) ? previous : [...previous, partIndex]);
      await new Promise<void>(resolve => window.setTimeout(resolve, 800));
      if (partIndex + 1 < actualTotalParts) setSelectedPart(partIndex + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to generate department forms.");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }

  return (
    <section aria-busy={generating} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Generate forms by department</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Choose a division and download all chapters or one specific chapter. Selections above 500 members are split into separate PDFs.
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Division / Department
            </span>
            <select
              value={selected}
              onChange={event => {
                setSelected(event.target.value);
                setChapters([]);
                setSelectedChapter("");
                setSelectedPart(0);
                setCompletedParts([]);
                setError(null);
              }}
              disabled={loadingDepartments || generating}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
            >
              <option value="">{loadingDepartments ? "Loading departments…" : "Select a department"}</option>
              {departments.map(department => (
                <option key={department.name} value={department.name}>
                  {department.name} ({department.count} {department.count === 1 ? "member" : "members"})
                </option>
              ))}
            </select>
          </label>

          {selectedDepartment && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Chapter
              </span>
              <select
                value={selectedChapter}
                onChange={event => {
                  setSelectedChapter(event.target.value);
                  setSelectedPart(0);
                  setCompletedParts([]);
                  setError(null);
                }}
                disabled={loadingChapters || generating}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
              >
                <option value="">
                  {loadingChapters
                    ? "Loading chaptersâ€¦"
                    : `All chapters (${selectedDepartment.count.toLocaleString()} members)`}
                </option>
                {chapters.map(chapter => (
                  <option key={chapter.name} value={chapter.name}>
                    {chapter.name} ({chapter.count.toLocaleString()} {chapter.count === 1 ? "member" : "members"})
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedDepartment && totalParts > 1 && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                PDF Part
              </span>
              <select
                value={selectedPart}
                onChange={event => {
                  setSelectedPart(Number(event.target.value));
                  setError(null);
                }}
                disabled={generating}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
              >
                {Array.from({ length: totalParts }, (_, index) => {
                  const start = index * MAX_FORMS_PER_PDF + 1;
                  const count = Math.min(MAX_FORMS_PER_PDF, selectedScopeCount - index * MAX_FORMS_PER_PDF);
                  const end = start + count - 1;
                  const completed = completedParts.includes(index) ? " - generated" : "";
                  return (
                    <option key={index} value={index}>
                      Part {index + 1} of {totalParts}: members {start.toLocaleString()} to {end.toLocaleString()} ({count.toLocaleString()} forms){completed}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={generateDepartmentPdf}
          disabled={!selected || generating || loadingDepartments || loadingChapters}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {generating
            ? `Generating ${progress?.percent ?? 0}%`
            : totalParts > 1
              ? `Generate Part ${selectedPart + 1} PDF`
              : selectedChapter
                ? "Generate Chapter PDF"
                : "Generate Department PDF"}
        </button>
      </div>

      {generating && progress && (
        <div
          className="border-t border-brand-100 bg-brand-50/60 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/80"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>{progress.stage}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{progress.detail}</p>
            </div>
            <span className="shrink-0 font-mono text-sm font-bold text-brand-700">{progress.percent}%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-white shadow-inner dark:bg-slate-800"
            role="progressbar"
            aria-label="Department PDF generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Please keep this tab open until the download begins.
          </p>
        </div>
      )}

      {!generating && selectedDepartment && selectedScopeCount >= 250 && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-relaxed text-amber-800">
          <span className="font-semibold">Large batch:</span>{" "}
          {totalParts > 1
            ? `This selection is divided into ${totalParts} PDF parts with no more than ${MAX_FORMS_PER_PDF} forms each. Generate and download one part at a time.`
            : "Use a desktop browser and keep this tab open. The final PDF rendering step can take several minutes."}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <UsersRound className="h-3.5 w-3.5" />
          {selectedDepartment
            ? totalParts > 1
              ? `${selectedScopeCount.toLocaleString()} forms${selectedChapter ? ` from ${selectedChapter}` : ""} split into ${totalParts} PDFs; Part ${selectedPart + 1} contains ${selectedPartCount.toLocaleString()} forms`
              : `${selectedScopeCount.toLocaleString()} personalized ${selectedScopeCount === 1 ? "form" : "forms"}${selectedChapter ? ` from ${selectedChapter}` : ""} will be included`
            : `${departments.length} departments available`}
        </span>
        <span>Each PDF is loaded and built separately to reduce browser memory use.</span>
      </div>

      {error && (
        <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>
      )}
    </section>
  );
}
