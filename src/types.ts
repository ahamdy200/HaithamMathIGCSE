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
  phase1Extraction?: string;
  phase2ErrorAnalysis?: string;
  phase3Solution?: string;
  status: 'correct' | 'partial' | 'incorrect';
  statusLabel?: 'CORRECT' | 'INCORRECT' | 'PARTIAL';
  errorAnalysis?: string;
  teacherFeedback: string;
}

export interface HomeworkActionPlanItem {
  title: string;
  detail: string;
}

export type GradingSystem = 'edexcel' | 'ib' | 'marks';
export type AssignmentKind = 'homework' | 'quiz' | 'essay';

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: 'mcq' | 'short';
  options?: string[];
  correctAnswer?: string;
  marks: number;
}

export interface QuizDefinition {
  id: string;
  courseId: string;
  title: string;
  kind: 'quiz' | 'essay';
  gradingSystem: GradingSystem;
  instructions: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface OutboxEmailRecord {
  id: string;
  createdAt: string;
  submissionId: string;
  studentId: number;
  studentName: string;
  parentName?: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  provider: 'resend' | 'local-preview';
  status: 'sent' | 'logged_locally' | 'failed';
  resendId?: string;
  note?: string;
}

export interface DirectorySeatUser {
  id: number;
  domain: string;
  username: string;
  password: string;
  fullName: string;
  role: 'student' | 'parent' | 'teacher';
  grade?: string;
  section?: string;
  parentEmail?: string;
  linkedStudentId?: number;
  linkedStudentName?: string;
  createdAt: string;
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
  gradingSystem?: GradingSystem;
  assignmentKind?: AssignmentKind;
  criterionBreakdown?: Array<{ label: string; score: string; note?: string }>;
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
  gradingMeta?: {
    model: string;
    precisionMode?: string;
    twoPassOcrUsed?: boolean;
    pageCount?: number;
    mediaResolution?: string;
    thinkingLevel?: string;
  };
}


export interface HomeworkAssignmentRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  instructions: string;
  dueDate: string;
  gradingSystem: GradingSystem;
  createdAt: string;
  createdBy: string;
}

export interface PortalNotification {
  id: string;
  recipientRole: 'student' | 'parent' | 'teacher' | 'all';
  courseId?: string;
  studentId?: number;
  submissionId?: string;
  title: string;
  message: string;
  type: 'assignment' | 'report' | 'submission';
  dueDate?: string;
  createdAt: string;
  readByUserIds: number[];
}
