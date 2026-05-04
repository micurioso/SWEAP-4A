"use client";
import { useState } from "react";
import ImportSection from "@/components/import-section";
import ExportForm from "@/components/export-form";
import DangerZone from "@/components/danger-zone";

type Tab = "import" | "export" | "danger";

export default function DataManagementTabs({ chapters, divisions }: { chapters: string[]; divisions: string[] }) {
  const [tab, setTab] = useState<Tab>("import");

  const tabs: { key: Tab; label: string; danger?: boolean }[] = [
    { key: "import", label: "Import" },
    { key: "export", label: "Export" },
    { key: "danger", label: "Danger Zone", danger: true }
  ];

  return (
    <div className="space-y-5">
      <div className="flex border-b border-slate-200">
        {tabs.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "border-b-2 px-4 py-2 text-sm font-medium transition",
                active
                  ? t.danger
                    ? "border-red-600 text-red-700"
                    : "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800",
                t.danger && !active ? "text-red-500/80 hover:text-red-700" : ""
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "import" && <ImportSection />}
      {tab === "export" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Download a CSV file matching the original Google Forms column layout.</p>
          <ExportForm chapters={chapters} divisions={divisions} />
        </div>
      )}
      {tab === "danger" && <DangerZone />}
    </div>
  );
}
