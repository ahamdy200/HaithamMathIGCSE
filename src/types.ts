export type CellType = 'code' | 'markdown';

export interface NotebookCell {
  id: string;
  type: CellType;
  content: string;
  output?: string;
  isExecuting?: boolean;
  executionCount?: number | null;
  executionTimeMs?: number;
  error?: string;
  isCollapsed?: boolean;
}

export interface SourceDocument {
  id: string;
  title: string;
  type: 'doc' | 'pdf' | 'web' | 'note';
  snippet: string;
  content: string;
  tokenCount?: number;
}

export interface DialogueTurn {
  speaker: 'Alex' | 'Jordan';
  text: string;
}

export interface AudioOverviewData {
  title: string;
  durationSeconds: number;
  turns: DialogueTurn[];
}

export interface QuestionGrading {
  questionNumber: number;
  displayLabel?: string;
  paperRef: string;
  prompt: string;
  topicExpression?: string;
  maxMarks: number;
  earnedMarks: number;
  markSchemeRef: string;
  studentWorkingFound: string;
  modelSolution: string;
  status: 'correct' | 'partial' | 'incorrect';
  statusLabel?: 'CORRECT' | 'INCORRECT' | 'PARTIAL';
  errorAnalysis?: string;
  teacherFeedback: string;
}

export interface HomeworkActionPlanItem {
  title: string;
  detail: string;
}

export interface HomeworkGradingReport {
  studentName: string;
  assignmentTitle: string;
  teacherName: string;
  subject: string;
  chapter?: string;
  topic?: string;
  headerTitle?: string;
  reportTitle?: string;
  submissionDate: string;
  totalMarks: number;
  earnedMarks: number;
  percentage: number;
  grade: string;
  performanceLevel: string;
  generalFeedback: string;
  diagnosticReview?: string;
  actionPlan?: HomeworkActionPlanItem[];
  pdfUrl?: string;
  uploadedFile?: string;
  questions: QuestionGrading[];
  strengths: string[];
  recommendedNextSteps: string[];
  executionTimeMs?: number;
}

