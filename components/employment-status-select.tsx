"use client";

import { useEffect, useMemo, useState, type SelectHTMLAttributes } from "react";
import {
  DEFAULT_EMPLOYMENT_STATUS_OPTIONS,
  type EmploymentStatusOption
} from "@/lib/employment-statuses";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  emptyLabel?: string;
};

export default function EmploymentStatusSelect({
  emptyLabel = "Select employment status",
  value,
  ...selectProps
}: Props) {
  const [options, setOptions] = useState<EmploymentStatusOption[]>(DEFAULT_EMPLOYMENT_STATUS_OPTIONS);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/reference/employment-statuses")
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!cancelled && Array.isArray(result?.statuses) && result.statuses.length > 0) {
          setOptions(result.statuses);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const availableOptions = useMemo(() => {
    const currentValue = typeof value === "string" ? value.trim() : "";
    if (!currentValue || options.some((option) => option.value === currentValue)) return options;
    return [{ value: currentValue, label: `${currentValue} (existing value)` }, ...options];
  }, [options, value]);

  return (
    <select {...selectProps} value={value}>
      <option value="">{emptyLabel}</option>
      {availableOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
