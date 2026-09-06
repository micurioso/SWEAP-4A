export type EmploymentStatusOption = {
  value: string;
  label: string;
};

export const DEFAULT_EMPLOYMENT_STATUS_OPTIONS: EmploymentStatusOption[] = [
  { value: "Casual", label: "Casual" },
  { value: "Contract of Service", label: "Contract of Service" },
  { value: "Contractual", label: "Contractual" },
  { value: "Job Order", label: "Job Order" },
  { value: "Permanent", label: "Permanent" }
];
