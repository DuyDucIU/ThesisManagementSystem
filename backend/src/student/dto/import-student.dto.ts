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

export interface ImportStudentsResult {
  imported: number;
  skipped: number;
  skippedDetails: SkippedDetail[];
}
