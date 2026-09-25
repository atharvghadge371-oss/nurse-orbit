export interface QuizResultItem {
  question_id: string;
  question: string;
  options: string[];
  selected_index: number | null;
  correct_index: number;
  correct: boolean;
  time_spent_seconds: number;
  topic: string;
  subject_id: string;
  explanation?: string;
  rationale?: string;
  reference?: string;
}

export interface ExamReportData {
  mode: "mock" | "timed" | string;
  subjectId?: string;
  totalQuestions: number;
  totalScore: number;
  timeSpentSeconds: number;
  results: QuizResultItem[];
  completedAt: string;
}

let latestReport: ExamReportData | null = null;

export const setLatestReport = (report: ExamReportData) => {
  latestReport = report;
};

export const getLatestReport = (): ExamReportData | null => {
  return latestReport;
};
