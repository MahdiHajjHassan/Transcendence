export type SupportArea = 'REGISTRATION' | 'IT';
export type AcademicDepartment =
  | 'ENGINEERING'
  | 'BUSINESS'
  | 'LAW'
  | 'MEDICINE';

export const supportAreaOptions: Array<{
  value: SupportArea;
  label: string;
}> = [
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'IT', label: 'IT Support' },
];

export const academicDepartmentOptions: Array<{
  value: AcademicDepartment;
  label: string;
}> = [
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'LAW', label: 'Law' },
  { value: 'MEDICINE', label: 'Medicine' },
];

export function formatSupportArea(value: SupportArea | null | undefined) {
  return supportAreaOptions.find((option) => option.value === value)?.label ?? 'Unassigned';
}

export function formatAcademicDepartment(
  value: AcademicDepartment | null | undefined,
) {
  return (
    academicDepartmentOptions.find((option) => option.value === value)?.label ??
    'Unassigned'
  );
}

export function formatRoutingLane(
  supportArea: SupportArea | null | undefined,
  academicDepartment: AcademicDepartment | null | undefined,
) {
  if (!supportArea && !academicDepartment) {
    return 'Unassigned';
  }

  return `${formatSupportArea(supportArea)} · ${formatAcademicDepartment(
    academicDepartment,
  )}`;
}
