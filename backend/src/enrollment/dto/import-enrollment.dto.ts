export interface SemesterSummary {
  id: number;
  code: string;
  name: string;
}

export interface ParseRowError {
  row: number;
  reason: string;
}

export interface AlreadyEnrolledDetail {
  row: number;
  studentId: string;
  reason: string;
}

export interface ParseImportResult {
  semester: SemesterSummary;
  total: number;
  valid: number;
  alreadyEnrolled: number;
  invalid: number;
  errors: ParseRowError[];
  alreadyEnrolledDetails: AlreadyEnrolledDetail[];
}

export interface SkippedDetail {
  row: number;
  studentId: string | null;
  reason: string;
}

export interface ImportEnrollmentsResult {
  semester: SemesterSummary;
  imported: number;
  skipped: number;
  skippedDetails: SkippedDetail[];
}
